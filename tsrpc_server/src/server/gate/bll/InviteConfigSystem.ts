import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import type { InviteRewardConfig } from "./InviteSystem";
import { MongoDBService } from "../db/MongoDBService";

export type InviteConfigStatus = 'active' | 'pending' | 'archived';
export type InviteConfigReviewStatus = 'approved' | 'pending' | 'rejected';

export interface InviteRewardConfigRecord {
    _id?: ObjectId;
    version: number;
    config: InviteRewardConfig;
    status: InviteConfigStatus;
    reviewStatus: InviteConfigReviewStatus;
    updatedAt: number;
    updatedBy: {
        adminId: string;
        username: string;
    };
    comment?: string;
    reviewer?: {
        adminId: string;
        username: string;
    };
    reviewedAt?: number;
}

export interface InviteRewardConfigHistory extends InviteRewardConfigRecord {
    historyId: string;
    createdAt: number;
}

/**
 * 管理后台专用的邀请奖励配置系统
 * 负责记录配置版本、审批状态与更新日志
 */
export class InviteConfigSystem {
    private static readonly COLLECTION = 'invite_reward_configs';
    private static readonly HISTORY_COLLECTION = 'invite_reward_config_history';
    private static readonly CACHE_TTL = 60 * 1000;

    private static cache: {
        record: InviteRewardConfigRecord;
        expireAt: number;
    } | null = null;

    private static readonly DEFAULT_CONFIG: InviteRewardConfig = {
        registerReward: 5,
        registerRewardInviter: 5,
        firstChargeRate: 10,
        level10Reward: 50,
        level20Reward: 100,
        level30Reward: 200
    };

    /**
     * 获取当前生效的邀请配置
     */
    static async getActiveConfig(): Promise<InviteRewardConfigRecord> {
        if (this.cache && this.cache.expireAt > Date.now()) {
            return this.cache.record;
        }

        const collection = MongoDBService.getCollection<InviteRewardConfigRecord>(this.COLLECTION);
        let record: InviteRewardConfigRecord | null = await collection.findOne(
            { status: 'active' },
            { sort: { updatedAt: -1 } }
        );

        if (!record) {
            const now = Date.now();
            record = {
                version: 1,
                config: this.DEFAULT_CONFIG,
                status: 'active',
                reviewStatus: 'approved',
                updatedAt: now,
                updatedBy: { adminId: 'system', username: 'system' },
                reviewer: { adminId: 'system', username: 'system' },
                reviewedAt: now,
                comment: '初始化默认配置'
            };

            await collection.insertOne(record);
            await this.appendHistory(record);
        }

        this.cache = {
            record,
            expireAt: Date.now() + this.CACHE_TTL
        };

        return record;
    }

    /**
     * 更新邀请奖励配置（默认直接生效并记录审批信息）
     */
    static async updateConfig(params: {
        adminId: string;
        adminName: string;
        config: InviteRewardConfig;
        comment?: string;
        reviewerId?: string;
        reviewerName?: string;
        reviewStatus?: InviteConfigReviewStatus;
    }): Promise<InviteRewardConfigRecord> {
        const normalized = this.normalizeConfig(params.config);
        const current = await this.getActiveConfig();
        const now = Date.now();
        const nextVersion = (current?.version || 0) + 1;

        const reviewer = {
            adminId: params.reviewerId || params.adminId,
            username: params.reviewerName || params.adminName
        };
        const reviewStatus: InviteConfigReviewStatus = params.reviewStatus || 'approved';
        const status: InviteConfigStatus = reviewStatus === 'approved' ? 'active' : 'pending';

        const record: InviteRewardConfigRecord = {
            version: nextVersion,
            config: normalized,
            status,
            reviewStatus,
            updatedAt: now,
            updatedBy: {
                adminId: params.adminId,
                username: params.adminName
            },
            reviewer,
            reviewedAt: reviewStatus === 'approved' ? now : undefined,
            comment: params.comment
        };

        const collection = MongoDBService.getCollection<InviteRewardConfigRecord>(this.COLLECTION);

        if (status === 'active') {
            await collection.updateMany({ status: 'active' }, { $set: { status: 'archived' } });
        }

        await collection.insertOne(record);
        await this.appendHistory(record);

        if (status === 'active') {
            this.cache = {
                record,
                expireAt: Date.now() + this.CACHE_TTL
            };
        } else {
            this.cache = null;
        }

        return record;
    }

    /**
     * 获取历史记录
     */
    static async getHistory(params: {
        page?: number;
        limit?: number;
        status?: InviteConfigReviewStatus;
    }): Promise<{
        history: InviteRewardConfigHistory[];
        total: number;
        page: number;
        pageSize: number;
    }> {
        const page = params.page ?? 1;
        const limit = params.limit ?? 10;
        const collection = MongoDBService.getCollection<InviteRewardConfigHistory>(this.HISTORY_COLLECTION);
        const query: any = {};

        if (params.status) {
            query.reviewStatus = params.status;
        }

        const total = await collection.countDocuments(query);
        const history = await collection
            .find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        return {
            history,
            total,
            page,
            pageSize: limit
        };
    }

    /**
     * 供运行时使用的奖励配置获取方法
     */
    static async getRewardConfig(): Promise<InviteRewardConfig> {
        const record = await this.getActiveConfig();
        return record.config;
    }

    /**
     * 追加历史记录
     */
    private static async appendHistory(record: InviteRewardConfigRecord): Promise<void> {
        const collection = MongoDBService.getCollection<InviteRewardConfigHistory>(this.HISTORY_COLLECTION);
        const history: InviteRewardConfigHistory = {
            ...record,
            historyId: randomUUID(),
            createdAt: record.updatedAt
        };
        await collection.insertOne(history);
    }

    private static normalizeConfig(config: InviteRewardConfig): InviteRewardConfig {
        return {
            registerReward: Math.max(0, Math.floor(config.registerReward)),
            registerRewardInviter: Math.max(0, Math.floor(config.registerRewardInviter)),
            firstChargeRate: Math.max(0, Math.min(100, Math.floor(config.firstChargeRate))),
            level10Reward: Math.max(0, Math.floor(config.level10Reward)),
            level20Reward: Math.max(0, Math.floor(config.level20Reward)),
            level30Reward: Math.max(0, Math.floor(config.level30Reward))
        };
    }

    /**
     * 主动清理缓存（测试或外部指令使用）
     */
    static clearCache() {
        this.cache = null;
    }
}
