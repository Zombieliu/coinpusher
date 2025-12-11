/**
 * 🎁 邀请系统
 *
 * 功能：
 * 1. 生成邀请码/链接
 * 2. 邀请奖励（双方获益）
 * 3. 邀请统计
 * 4. 多级邀请（3-6层）
 * 5. 邀请排行榜
 * 6. 邀请任务
 *
 * 奖励机制：
 * - 被邀请人注册：双方+5金币
 * - 被邀请人首充：邀请人+10%
 * - 被邀请人达到10级：邀请人+50金币
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { InviteConfigSystem } from './InviteConfigSystem';

/** 邀请关系 */
export interface InviteRelation {
    inviterId: string;          // 邀请人ID
    inviteeId: string;          // 被邀请人ID
    inviteCode: string;         // 使用的邀请码
    invitedAt: number;          // 邀请时间
    rewardGiven: boolean;       // 是否已发放注册奖励
    firstChargeRewardGiven: boolean;  // 是否已发放首充奖励
    level10RewardGiven: boolean;      // 是否已发放10级奖励
}

/** 邀请统计 */
export interface InviteStats {
    _id?: ObjectId;
    userId: string;
    totalInvites: number;       // 总邀请人数
    validInvites: number;       // 有效邀请人数
    totalRewards: number;       // 总获得奖励
    inviteCode: string;         // 邀请码
    inviteLink: string;         // 邀请链接
}

/** 邀请奖励配置 */
export interface InviteRewardConfig {
    registerReward: number;     // 注册奖励（金币）
    registerRewardInviter: number;  // 邀请人注册奖励
    firstChargeRate: number;    // 首充返利比例（%）
    level10Reward: number;      // 10级奖励
    level20Reward: number;      // 20级奖励
    level30Reward: number;      // 30级奖励
}

export class InviteSystem {

    /**
     * 生成邀请码
     */
    static generateInviteCode(userId: string): string {
        const hash = crypto.createHash('md5')
            .update(`${userId}_${Date.now()}`)
            .digest('hex')
            .substring(0, 8)
            .toUpperCase();
        return `INV${hash}`;
    }

    /**
     * 获取用户邀请信息
     */
    static async getUserInviteInfo(userId: string): Promise<InviteStats> {
        const collection = MongoDBService.getCollection<InviteStats>('invite_stats');
        let stats = await collection.findOne({ userId }) as InviteStats | null;

        if (!stats) {
            const inviteCode = this.generateInviteCode(userId);
            const inviteLink = `https://game.example.com/invite/${inviteCode}`;

            stats = {
                userId,
                totalInvites: 0,
                validInvites: 0,
                totalRewards: 0,
                inviteCode,
                inviteLink
            };

            await collection.insertOne(stats);
        }

        return stats;
    }

    /**
     * 接受邀请（新用户注册时调用）
     */
    static async acceptInvite(
        inviteeId: string,
        inviteCode: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        // 查找邀请人
        const statsCollection = MongoDBService.getCollection<InviteStats>('invite_stats');
        const inviterStats = await statsCollection.findOne({ inviteCode });

        if (!inviterStats) {
            return { success: false, error: '邀请码无效' };
        }

        const inviterId = inviterStats.userId;

        // 检查是否自己邀请自己
        if (inviterId === inviteeId) {
            return { success: false, error: '不能使用自己的邀请码' };
        }

        // 检查是否已经被邀请过
        const relationCollection = MongoDBService.getCollection<InviteRelation>('invite_relations');
        const existing = await relationCollection.findOne({ inviteeId });

        if (existing) {
            return { success: false, error: '已经使用过邀请码' };
        }

        // 创建邀请关系
        const relation: InviteRelation = {
            inviterId,
            inviteeId,
            inviteCode,
            invitedAt: Date.now(),
            rewardGiven: false,
            firstChargeRewardGiven: false,
            level10RewardGiven: false
        };

        await relationCollection.insertOne(relation);

        // 发放注册奖励
        await this.giveRegisterReward(inviterId, inviteeId);

        // 更新邀请统计
        await statsCollection.updateOne(
            { userId: inviterId },
            {
                $inc: {
                    totalInvites: 1,
                    validInvites: 1
                }
            }
        );

        console.log(`[InviteSystem] 用户 ${inviteeId} 接受了 ${inviterId} 的邀请`);

        return { success: true };
    }

    /**
     * 发放注册奖励
     */
    private static async giveRegisterReward(inviterId: string, inviteeId: string): Promise<void> {
        const rewardConfig = await InviteConfigSystem.getRewardConfig();

        // 给被邀请人奖励
        const invitee = await UserDB.getUserById(inviteeId);
        if (invitee) {
            await UserDB.updateUser(inviteeId, {
                gold: invitee.gold + rewardConfig.registerReward
            });
        }

        // 给邀请人奖励
        const inviter = await UserDB.getUserById(inviterId);
        if (inviter) {
            await UserDB.updateUser(inviterId, {
                gold: inviter.gold + rewardConfig.registerRewardInviter
            });

            // 更新总奖励
            const statsCollection = MongoDBService.getCollection<InviteStats>('invite_stats');
            await statsCollection.updateOne(
                { userId: inviterId },
                { $inc: { totalRewards: rewardConfig.registerRewardInviter } }
            );
        }

        // 标记奖励已发放
        const relationCollection = MongoDBService.getCollection<InviteRelation>('invite_relations');
        await relationCollection.updateOne(
            { inviterId, inviteeId },
            { $set: { rewardGiven: true } }
        );

        console.log(`[InviteSystem] 注册奖励已发放：邀请人${inviterId} +${rewardConfig.registerRewardInviter}金币，被邀请人${inviteeId} +${rewardConfig.registerReward}金币`);
    }

    /**
     * 处理首充奖励
     */
    static async handleFirstCharge(userId: string, amount: number): Promise<void> {
        const relationCollection = MongoDBService.getCollection<InviteRelation>('invite_relations');
        const relation = await relationCollection.findOne({ inviteeId: userId });

        if (!relation || relation.firstChargeRewardGiven) {
            return;
        }

        // 计算返利
        const rewardConfig = await InviteConfigSystem.getRewardConfig();
        const rewardAmount = Math.floor(amount * rewardConfig.firstChargeRate / 100);

        // 给邀请人奖励
        const inviter = await UserDB.getUserById(relation.inviterId);
        if (inviter) {
            await UserDB.updateUser(relation.inviterId, {
                gold: inviter.gold + rewardAmount
            });

            // 更新总奖励
            const statsCollection = MongoDBService.getCollection<InviteStats>('invite_stats');
            await statsCollection.updateOne(
                { userId: relation.inviterId },
                { $inc: { totalRewards: rewardAmount } }
            );
        }

        // 标记奖励已发放
        await relationCollection.updateOne(
            { inviterId: relation.inviterId, inviteeId: userId },
            { $set: { firstChargeRewardGiven: true } }
        );

        console.log(`[InviteSystem] 首充奖励已发放：邀请人${relation.inviterId} +${rewardAmount}金币（${userId}首充${amount}）`);
    }

    /**
     * 处理等级奖励
     */
    static async handleLevelUpReward(userId: string, level: number): Promise<void> {
        const relationCollection = MongoDBService.getCollection<InviteRelation>('invite_relations');
        const relation = await relationCollection.findOne({ inviteeId: userId });

        if (!relation) {
            return;
        }

        const rewardConfig = await InviteConfigSystem.getRewardConfig();
        let rewardAmount = 0;
        let shouldGiveReward = false;

        if (level >= 10 && !relation.level10RewardGiven) {
            rewardAmount = rewardConfig.level10Reward;
            shouldGiveReward = true;
            await relationCollection.updateOne(
                { inviterId: relation.inviterId, inviteeId: userId },
                { $set: { level10RewardGiven: true } }
            );
        } else if (level >= 20) {
            rewardAmount = rewardConfig.level20Reward;
            shouldGiveReward = true;
        } else if (level >= 30) {
            rewardAmount = rewardConfig.level30Reward;
            shouldGiveReward = true;
        }

        if (!shouldGiveReward || rewardAmount === 0) {
            return;
        }

        // 给邀请人奖励
        const inviter = await UserDB.getUserById(relation.inviterId);
        if (inviter) {
            await UserDB.updateUser(relation.inviterId, {
                gold: inviter.gold + rewardAmount
            });

            // 更新总奖励
            const statsCollection = MongoDBService.getCollection<InviteStats>('invite_stats');
            await statsCollection.updateOne(
                { userId: relation.inviterId },
                { $inc: { totalRewards: rewardAmount } }
            );
        }

        console.log(`[InviteSystem] 等级奖励已发放：邀请人${relation.inviterId} +${rewardAmount}金币（${userId}达到${level}级）`);
    }

    /**
     * 获取邀请列表
     */
    static async getInviteList(userId: string, limit: number = 50): Promise<Array<{
        inviteeId: string;
        invitedAt: number;
        rewardGiven: boolean;
    }>> {
        const collection = MongoDBService.getCollection<InviteRelation>('invite_relations');
        const relations = await collection
            .find({ inviterId: userId })
            .sort({ invitedAt: -1 })
            .limit(limit)
            .toArray();

        return relations.map(r => ({
            inviteeId: r.inviteeId,
            invitedAt: r.invitedAt,
            rewardGiven: r.rewardGiven
        }));
    }

    /**
     * 获取邀请排行榜
     */
    static async getInviteLeaderboard(limit: number = 100): Promise<Array<{
        userId: string;
        totalInvites: number;
        totalRewards: number;
    }>> {
        const collection = MongoDBService.getCollection<InviteStats>('invite_stats');
        const stats = await collection
            .find()
            .sort({ totalInvites: -1 })
            .limit(limit)
            .toArray();

        return stats.map(s => ({
            userId: s.userId,
            totalInvites: s.totalInvites,
            totalRewards: s.totalRewards
        }));
    }

    /**
     * 获取邀请链深度（多级邀请）
     */
    static async getInviteChainDepth(userId: string): Promise<number> {
        const collection = MongoDBService.getCollection<InviteRelation>('invite_relations');
        let depth = 0;
        let currentId = userId;

        while (depth < 10) {  // 最多追溯10层
            const relation = await collection.findOne({ inviteeId: currentId });
            if (!relation) {
                break;
            }
            depth++;
            currentId = relation.inviterId;
        }

        return depth;
    }

    /**
     * 获取邀请树（下级列表）
     */
    static async getInviteTree(userId: string, maxDepth: number = 3): Promise<any> {
        const collection = MongoDBService.getCollection<InviteRelation>('invite_relations');

        const buildTree = async (id: string, depth: number): Promise<any> => {
            if (depth >= maxDepth) {
                return null;
            }

            const children = await collection.find({ inviterId: id }).toArray();

            return {
                userId: id,
                children: await Promise.all(
                    children.map(c => buildTree(c.inviteeId, depth + 1))
                )
            };
        };

        return await buildTree(userId, 0);
    }
}
