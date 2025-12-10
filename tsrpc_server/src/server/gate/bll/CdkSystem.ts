import { MongoDBService } from "../db/MongoDBService";
import { UserDB } from "../data/UserDB";
import { ItemSystem } from "./ItemSystem";
import crypto from 'crypto';

export enum CdkType {
    Single = 'single',       // 单次使用（每个码只能被一个人用一次）
    Universal = 'universal'  // 通用码（一个码可以被多人使用，每人限一次）
}

export interface CdkReward {
    gold?: number;
    tickets?: number;
    items?: { itemId: string; quantity: number }[];
}

export interface CdkCode {
    code: string;
    batchId: string;
    type: CdkType;
    name: string; // 批次名称或用途备注
    rewards: CdkReward;
    
    usageLimit: number; // 总使用次数限制（-1表示无限）
    usageCount: number; // 已使用总次数
    
    // 只有 Single 类型需要记录 usedBy，Universal 类型因为人多，单独存 CdkUsageLog
    usedBy?: string;    // Single类型的使用者
    
    startTime?: number; // 生效时间
    expireAt: number;   // 过期时间
    
    createdAt: number;
    createdBy: string;
    active: boolean;
}

export interface CdkUsageLog {
    code: string;
    userId: string;
    rewards: CdkReward;
    usedAt: number;
}

export class CdkSystem {
    
    /**
     * 生成CDK
     */
    static async generateCdk(params: {
        batchId: string;
        name: string;
        type: CdkType;
        rewards: CdkReward;
        count: number; // 生成数量
        usageLimit: number; // 针对Universal类型的总限制，Single固定为1
        prefix?: string; // 前缀
        length?: number; // 长度
        expireAt: number;
        createdBy: string;
    }): Promise<string[]> {
        const collection = MongoDBService.getCollection<CdkCode>('cdk_codes');
        const codes: string[] = [];
        const now = Date.now();
        const prefix = params.prefix || '';
        const length = params.length || 10;

        for (let i = 0; i < params.count; i++) {
            let code = '';
            // 尝试生成不重复的码
            for (let retry = 0; retry < 10; retry++) {
                const randomPart = crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
                code = prefix + randomPart;
                const exists = await collection.findOne({ code });
                if (!exists) break;
            }

            const cdk: CdkCode = {
                code,
                batchId: params.batchId,
                name: params.name,
                type: params.type,
                rewards: params.rewards,
                usageLimit: params.type === CdkType.Single ? 1 : params.usageLimit,
                usageCount: 0,
                expireAt: params.expireAt,
                createdAt: now,
                createdBy: params.createdBy,
                active: true
            };
            
            await collection.insertOne(cdk);
            codes.push(code);
        }

        return codes;
    }

    /**
     * 兑换CDK
     */
    static async exchangeCdk(userId: string, code: string): Promise<{ success: boolean; error?: string; rewards?: CdkReward }> {
        const collection = MongoDBService.getCollection<CdkCode>('cdk_codes');
        const logCollection = MongoDBService.getCollection<CdkUsageLog>('cdk_usage_logs');
        const now = Date.now();
        code = code.trim().toUpperCase();

        const cdk = await collection.findOne({ code });
        if (!cdk) return { success: false, error: '无效的兑换码' };
        
        if (!cdk.active) return { success: false, error: '兑换码已失效' };
        if (cdk.expireAt < now) return { success: false, error: '兑换码已过期' };
        if (cdk.startTime && cdk.startTime > now) return { success: false, error: '兑换码尚未生效' };
        
        if (cdk.usageLimit !== -1 && cdk.usageCount >= cdk.usageLimit) {
            return { success: false, error: '兑换码已被领完' };
        }

        // 检查用户是否已使用过
        const usedLog = await logCollection.findOne({ userId, code });
        if (usedLog) {
            return { success: false, error: '您已经领取过该兑换码' };
        }
        
        // 针对通用码，检查是否同批次已领取过（可选，这里简化为只检查code）
        // 如果想要 "每人限领一次同批次CDK"，需要查 batchId

        // 发放奖励
        await this.distributeRewards(userId, cdk.rewards);

        // 更新使用记录
        await collection.updateOne(
            { code },
            { 
                $inc: { usageCount: 1 },
                $set: cdk.type === CdkType.Single ? { usedBy: userId, active: false } : {}
            }
        );

        // 记录日志
        await logCollection.insertOne({
            code,
            userId,
            rewards: cdk.rewards,
            usedAt: now
        });

        return { success: true, rewards: cdk.rewards };
    }

    private static async distributeRewards(userId: string, rewards: CdkReward) {
        if (rewards.gold) {
            await UserDB.addGold(userId, rewards.gold);
        }
        if (rewards.tickets) {
            await UserDB.addTickets(userId, rewards.tickets);
        }
        if (rewards.items) {
            for (const item of rewards.items) {
                await ItemSystem.addItem(userId, item.itemId, item.quantity);
            }
        }
    }

    /**
     * 查询CDK列表（管理员）
     */
    static async getCdkList(query: {
        batchId?: string;
        code?: string;
        type?: CdkType;
        active?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{ list: CdkCode[], total: number }> {
        const collection = MongoDBService.getCollection<CdkCode>('cdk_codes');
        const dbQuery: any = {};

        if (query.batchId) dbQuery.batchId = query.batchId;
        if (query.code) dbQuery.code = { $regex: query.code, $options: 'i' };
        if (query.type) dbQuery.type = query.type;
        if (query.active !== undefined) dbQuery.active = query.active;

        const total = await collection.countDocuments(dbQuery);
        const list = await collection
            .find(dbQuery)
            .sort({ createdAt: -1 })
            .skip(((query.page || 1) - 1) * (query.limit || 20))
            .limit(query.limit || 20)
            .toArray();

        const normalizedList = list.map(item => {
            if (!item.batchId) {
                return {
                    ...item,
                    batchId: 'legacy'
                };
            }
            return item;
        });

        return { list: normalizedList, total };
    }
}
