/**
 * ⚡ Buff效果系统
 *
 * 功能：
 * 1. Buff管理（添加/移除/查询）
 * 2. Buff效果叠加
 * 3. Buff过期自动清理
 * 4. Buff效果计算
 *
 * Buff类型：
 * - 奖励倍数Buff
 * - 磁铁Buff
 * - 幸运符Buff
 * - 砸落器Buff
 * - 超级推进器Buff
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';

/** Buff类型 */
export enum BuffType {
    RewardMultiplier = 'reward_multiplier',  // 奖励倍数
    Magnet = 'magnet',                       // 磁铁
    LuckyCharm = 'lucky_charm',              // 幸运符
    HammerPush = 'hammer_push',              // 砸落器
    SuperPush = 'super_push'                 // 超级推进器
}

/** Buff状态 */
export enum BuffStatus {
    Active = 'active',      // 激活中
    Expired = 'expired'     // 已过期
}

/** Buff数据 */
export interface BuffData {
    buffId: string;
    userId: string;
    buffType: BuffType;
    status: BuffStatus;
    createdAt: number;      // 创建时间
    expiresAt: number;      // 过期时间
    duration: number;       // 持续时间（秒）
    params: any;            // Buff参数（来自道具效果）
}

/** Buff效果 */
export interface BuffEffect {
    buffType: BuffType;
    multiplier?: number;     // 倍数（用于奖励倍数）
    radius?: number;         // 范围（用于磁铁）
    force?: number;          // 力度（用于磁铁、推力）
    bonus?: number;          // 加成（用于幸运符）
    amount?: number;         // 数量（用于推进器）
}

export class BuffSystem {
    /**
     * Buff缓存Key前缀
     */
    private static readonly BUFF_CACHE_PREFIX = 'buff:user:';

    /**
     * 添加Buff
     */
    static async addBuff(
        userId: string,
        buffType: BuffType,
        duration: number,
        params: any = {}
    ): Promise<BuffData> {
        const now = Date.now();
        const buffId = `buff_${now}_${userId}_${buffType}`;

        const buff: BuffData = {
            buffId,
            userId,
            buffType,
            status: BuffStatus.Active,
            createdAt: now,
            expiresAt: now + duration * 1000,
            duration,
            params
        };

        // 保存到MongoDB
        const collection = MongoDBService.getCollection<BuffData>('user_buffs');
        await collection.insertOne(buff);

        // 缓存到DragonflyDB（5分钟过期）
        const cacheKey = `${this.BUFF_CACHE_PREFIX}${userId}`;
        const userBuffs = await this.getUserActiveBuffs(userId);
        userBuffs.push(buff);
        await DragonflyDBService.setJSON(cacheKey, userBuffs, 300);

        console.log(`[BuffSystem] 用户 ${userId} 获得Buff: ${buffType}，持续${duration}秒`);

        return buff;
    }

    /**
     * 获取用户激活的Buff列表
     */
    static async getUserActiveBuffs(userId: string): Promise<BuffData[]> {
        // 先查缓存
        const cacheKey = `${this.BUFF_CACHE_PREFIX}${userId}`;
        const cached = await DragonflyDBService.getJSON<BuffData[]>(cacheKey);

        if (cached) {
            // 过滤掉已过期的Buff
            const now = Date.now();
            return cached.filter(buff => buff.expiresAt > now && buff.status === BuffStatus.Active);
        }

        // 从MongoDB查询
        const collection = MongoDBService.getCollection<BuffData>('user_buffs');
        const now = Date.now();

        const buffs = await collection.find({
            userId,
            status: BuffStatus.Active,
            expiresAt: { $gt: now }
        }).toArray();

        // 写入缓存
        await DragonflyDBService.setJSON(cacheKey, buffs, 300);

        return buffs;
    }

    /**
     * 获取特定类型的Buff
     */
    static async getBuffByType(userId: string, buffType: BuffType): Promise<BuffData | null> {
        const buffs = await this.getUserActiveBuffs(userId);
        return buffs.find(b => b.buffType === buffType) || null;
    }

    /**
     * 移除Buff
     */
    static async removeBuff(buffId: string): Promise<void> {
        const collection = MongoDBService.getCollection<BuffData>('user_buffs');
        const buff = await collection.findOne({ buffId });

        if (!buff) {
            return;
        }

        await collection.updateOne(
            { buffId },
            { $set: { status: BuffStatus.Expired } }
        );

        // 清除缓存
        const cacheKey = `${this.BUFF_CACHE_PREFIX}${buff.userId}`;
        await DragonflyDBService.del(cacheKey);

        console.log(`[BuffSystem] 移除Buff: ${buffId}`);
    }

    /**
     * 移除用户的特定类型Buff
     */
    static async removeBuffByType(userId: string, buffType: BuffType): Promise<void> {
        const buff = await this.getBuffByType(userId, buffType);
        if (buff) {
            await this.removeBuff(buff.buffId);
        }
    }

    /**
     * 清理过期的Buff
     */
    static async cleanupExpiredBuffs(): Promise<void> {
        const collection = MongoDBService.getCollection<BuffData>('user_buffs');
        const now = Date.now();

        const result = await collection.updateMany(
            {
                status: BuffStatus.Active,
                expiresAt: { $lte: now }
            },
            {
                $set: { status: BuffStatus.Expired }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[BuffSystem] 清理了 ${result.modifiedCount} 个过期Buff`);
        }
    }

    /**
     * 计算奖励倍数（叠加所有倍数类Buff）
     */
    static async calculateRewardMultiplier(userId: string): Promise<number> {
        const buffs = await this.getUserActiveBuffs(userId);
        let totalMultiplier = 1.0;

        for (const buff of buffs) {
            if (buff.buffType === BuffType.RewardMultiplier && buff.params.rewardMultiplier) {
                totalMultiplier *= buff.params.rewardMultiplier;
            }
        }

        return totalMultiplier;
    }

    /**
     * 计算幸运加成（叠加所有幸运符Buff）
     */
    static async calculateLuckyBonus(userId: string): Promise<number> {
        const buffs = await this.getUserActiveBuffs(userId);
        let totalBonus = 0;

        for (const buff of buffs) {
            if (buff.buffType === BuffType.LuckyCharm && buff.params.luckyBonus) {
                totalBonus += buff.params.luckyBonus;
            }
        }

        return totalBonus;
    }

    /**
     * 获取磁铁效果
     */
    static async getMagnetEffect(userId: string): Promise<{
        active: boolean;
        radius?: number;
        force?: number;
    }> {
        const buff = await this.getBuffByType(userId, BuffType.Magnet);

        if (!buff) {
            return { active: false };
        }

        return {
            active: true,
            radius: buff.params.magnetRadius || 100,
            force: buff.params.magnetForce || 1.5
        };
    }

    /**
     * 检查是否有特定Buff
     */
    static async hasBuff(userId: string, buffType: BuffType): Promise<boolean> {
        const buff = await this.getBuffByType(userId, buffType);
        return buff !== null;
    }

    /**
     * 获取Buff剩余时间（秒）
     */
    static async getBuffRemainingTime(buffId: string): Promise<number> {
        const collection = MongoDBService.getCollection<BuffData>('user_buffs');
        const buff = await collection.findOne({ buffId });

        if (!buff || buff.status !== BuffStatus.Active) {
            return 0;
        }

        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((buff.expiresAt - now) / 1000));

        return remaining;
    }

    /**
     * 获取用户所有Buff的剩余时间
     */
    static async getUserBuffTimers(userId: string): Promise<Record<string, number>> {
        const buffs = await this.getUserActiveBuffs(userId);
        const timers: Record<string, number> = {};

        const now = Date.now();
        for (const buff of buffs) {
            const remaining = Math.max(0, Math.ceil((buff.expiresAt - now) / 1000));
            timers[buff.buffType] = remaining;
        }

        return timers;
    }

    /**
     * 获取所有Buff效果（用于游戏逻辑计算）
     */
    static async getAllBuffEffects(userId: string): Promise<BuffEffect[]> {
        const buffs = await this.getUserActiveBuffs(userId);
        const effects: BuffEffect[] = [];

        for (const buff of buffs) {
            const effect: BuffEffect = {
                buffType: buff.buffType
            };

            // 根据Buff类型提取参数
            switch (buff.buffType) {
                case BuffType.RewardMultiplier:
                    effect.multiplier = buff.params.rewardMultiplier;
                    break;

                case BuffType.Magnet:
                    effect.radius = buff.params.magnetRadius;
                    effect.force = buff.params.magnetForce;
                    break;

                case BuffType.LuckyCharm:
                    effect.bonus = buff.params.luckyBonus;
                    break;

                case BuffType.HammerPush:
                    effect.force = buff.params.hammerPushForce;
                    break;

                case BuffType.SuperPush:
                    effect.amount = buff.params.pushAmount;
                    break;
            }

            effects.push(effect);
        }

        return effects;
    }

    /**
     * 延长Buff时间
     */
    static async extendBuff(buffId: string, additionalSeconds: number): Promise<void> {
        const collection = MongoDBService.getCollection<BuffData>('user_buffs');
        const buff = await collection.findOne({ buffId });

        if (!buff || buff.status !== BuffStatus.Active) {
            return;
        }

        const newExpiresAt = buff.expiresAt + additionalSeconds * 1000;

        await collection.updateOne(
            { buffId },
            {
                $set: { expiresAt: newExpiresAt },
                $inc: { duration: additionalSeconds }
            }
        );

        // 清除缓存
        const cacheKey = `${this.BUFF_CACHE_PREFIX}${buff.userId}`;
        await DragonflyDBService.del(cacheKey);

        console.log(`[BuffSystem] Buff ${buffId} 延长了 ${additionalSeconds} 秒`);
    }

    /**
     * 获取Buff统计
     */
    static async getBuffStats(userId: string): Promise<{
        activeBuffCount: number;
        totalBuffUsed: number;
        mostUsedBuffType: BuffType | null;
    }> {
        const collection = MongoDBService.getCollection<BuffData>('user_buffs');

        const activeBuffCount = await collection.countDocuments({
            userId,
            status: BuffStatus.Active,
            expiresAt: { $gt: Date.now() }
        });

        const totalBuffUsed = await collection.countDocuments({ userId });

        // 统计最常用的Buff类型
        const pipeline = [
            { $match: { userId } },
            { $group: { _id: '$buffType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ];

        const result = await collection.aggregate(pipeline).toArray();
        const mostUsedBuffType = result.length > 0 ? result[0]._id as BuffType : null;

        return {
            activeBuffCount,
            totalBuffUsed,
            mostUsedBuffType
        };
    }

    /**
     * 定时任务：清理过期Buff
     */
    static startCleanupTimer(): void {
        // 每分钟清理一次过期Buff
        setInterval(async () => {
            await this.cleanupExpiredBuffs();
        }, 60 * 1000);

        console.log('[BuffSystem] Buff清理定时器已启动');
    }
}
