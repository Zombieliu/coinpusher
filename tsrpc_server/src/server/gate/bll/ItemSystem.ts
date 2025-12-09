/**
 * 🎒 道具系统
 *
 * 功能：
 * 1. 道具定义和配置
 * 2. 道具效果（Buff）
 * 3. 道具使用
 * 4. 道具获取
 * 5. 道具堆叠
 *
 * 道具类型：
 * - 砸落器：重击推动大量金币
 * - 倍数卡：30秒内掉落翻倍
 * - 磁铁卡：吸引边缘金币
 * - 幸运符：提升大奖概率10分钟
 * - 超级推进器：瞬间推动前排金币
 */

import { MongoDBService } from '../db/MongoDBService';
import { UserDB } from '../data/UserDB';
import { BuffSystem, BuffType } from './BuffSystem';

/** 道具类型 */
export enum ItemType {
    Hammer = 'hammer',              // 砸落器
    MultiplierCard = 'multiplier',  // 倍数卡
    MagnetCard = 'magnet',          // 磁铁卡
    LuckyCharm = 'lucky_charm',     // 幸运符
    SuperPusher = 'super_pusher'    // 超级推进器
}

/** 道具稀有度 */
export enum ItemRarity {
    Common = 'common',              // 普通
    Rare = 'rare',                  // 稀有
    Epic = 'epic',                  // 史诗
    Legendary = 'legendary'         // 传说
}

/** 道具效果类型 */
export enum ItemEffectType {
    Instant = 'instant',            // 即时效果
    Buff = 'buff',                  // Buff效果（持续时间）
    Passive = 'passive'             // 被动效果
}

/** 道具配置 */
export interface ItemConfig {
    itemId: string;                 // 道具ID
    type: ItemType;                 // 道具类型
    name: string;                   // 道具名称
    description: string;            // 道具描述
    rarity: ItemRarity;             // 稀有度
    effectType: ItemEffectType;     // 效果类型
    stackable: boolean;             // 是否可堆叠
    maxStack: number;               // 最大堆叠数
    cooldown: number;               // 冷却时间（秒）
    duration?: number;              // 持续时间（秒）
    effect: ItemEffect;             // 道具效果
}

/** 道具效果 */
export interface ItemEffect {
    // 砸落器效果
    hammerPushForce?: number;       // 推力倍数

    // 倍数卡效果
    rewardMultiplier?: number;      // 奖励倍数

    // 磁铁卡效果
    magnetRadius?: number;          // 吸引范围
    magnetForce?: number;           // 吸引力度

    // 幸运符效果
    luckyBonus?: number;            // 大奖概率提升（%）

    // 超级推进器效果
    pushAmount?: number;            // 推动金币数量
}

/** 用户道具 */
export interface UserItem {
    userId: string;
    itemId: string;
    quantity: number;               // 数量
    acquiredAt: number;             // 获得时间
    lastUsedAt?: number;            // 最后使用时间
}

/** 道具使用记录 */
export interface ItemUsageRecord {
    userId: string;
    itemId: string;
    usedAt: number;
    effectDuration?: number;
    cooldownEndsAt?: number;
}

export class ItemSystem {
    /**
     * 道具配置表
     */
    private static readonly ITEM_CONFIGS: Record<string, ItemConfig> = {
        // 砸落器
        'item_hammer': {
            itemId: 'item_hammer',
            type: ItemType.Hammer,
            name: '砸落器',
            description: '重击一次，推动大量金币！',
            rarity: ItemRarity.Rare,
            effectType: ItemEffectType.Instant,
            stackable: true,
            maxStack: 99,
            cooldown: 60,  // 1分钟冷却
            effect: {
                hammerPushForce: 5.0  // 5倍推力
            }
        },

        // 倍数卡
        'item_multiplier_2x': {
            itemId: 'item_multiplier_2x',
            type: ItemType.MultiplierCard,
            name: '倍数卡 x2',
            description: '30秒内掉落翻倍！',
            rarity: ItemRarity.Rare,
            effectType: ItemEffectType.Buff,
            stackable: true,
            maxStack: 50,
            cooldown: 120,  // 2分钟冷却
            duration: 30,   // 持续30秒
            effect: {
                rewardMultiplier: 2.0
            }
        },

        'item_multiplier_3x': {
            itemId: 'item_multiplier_3x',
            type: ItemType.MultiplierCard,
            name: '倍数卡 x3',
            description: '30秒内掉落3倍！',
            rarity: ItemRarity.Epic,
            effectType: ItemEffectType.Buff,
            stackable: true,
            maxStack: 30,
            cooldown: 120,
            duration: 30,
            effect: {
                rewardMultiplier: 3.0
            }
        },

        // 磁铁卡
        'item_magnet': {
            itemId: 'item_magnet',
            type: ItemType.MagnetCard,
            name: '磁铁卡',
            description: '吸引边缘金币，持续1分钟',
            rarity: ItemRarity.Rare,
            effectType: ItemEffectType.Buff,
            stackable: true,
            maxStack: 50,
            cooldown: 180,  // 3分钟冷却
            duration: 60,   // 持续1分钟
            effect: {
                magnetRadius: 100,
                magnetForce: 1.5
            }
        },

        // 幸运符
        'item_lucky_charm': {
            itemId: 'item_lucky_charm',
            type: ItemType.LuckyCharm,
            name: '幸运符',
            description: '提升大奖概率10%，持续10分钟',
            rarity: ItemRarity.Epic,
            effectType: ItemEffectType.Buff,
            stackable: true,
            maxStack: 20,
            cooldown: 600,  // 10分钟冷却
            duration: 600,  // 持续10分钟
            effect: {
                luckyBonus: 10  // 提升10%
            }
        },

        // 超级推进器
        'item_super_pusher': {
            itemId: 'item_super_pusher',
            type: ItemType.SuperPusher,
            name: '超级推进器',
            description: '瞬间推动前排所有金币！',
            rarity: ItemRarity.Legendary,
            effectType: ItemEffectType.Instant,
            stackable: true,
            maxStack: 10,
            cooldown: 300,  // 5分钟冷却
            effect: {
                pushAmount: 100  // 推动100个金币
            }
        }
    };

    /**
     * 获取道具配置
     */
    static getItemConfig(itemId: string): ItemConfig | null {
        return this.ITEM_CONFIGS[itemId] || null;
    }

    /**
     * 获取所有道具配置
     */
    static getAllItemConfigs(): ItemConfig[] {
        return Object.values(this.ITEM_CONFIGS);
    }

    /**
     * 获取用户道具列表
     */
    static async getUserItems(userId: string): Promise<UserItem[]> {
        const collection = MongoDBService.getCollection<UserItem>('user_items');
        return await collection.find({ userId }).toArray();
    }

    /**
     * 添加道具
     */
    static async addItem(
        userId: string,
        itemId: string,
        quantity: number = 1
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const config = this.getItemConfig(itemId);
        if (!config) {
            return { success: false, error: '道具不存在' };
        }

        const collection = MongoDBService.getCollection<UserItem>('user_items');

        // 查找已有道具
        const existingItem = await collection.findOne({ userId, itemId });

        if (existingItem) {
            // 检查堆叠上限
            if (config.stackable) {
                const newQuantity = existingItem.quantity + quantity;
                if (newQuantity > config.maxStack) {
                    return { success: false, error: `道具数量超过上限（${config.maxStack}）` };
                }

                await collection.updateOne(
                    { userId, itemId },
                    { $set: { quantity: newQuantity } }
                );
            } else {
                return { success: false, error: '该道具不可堆叠' };
            }
        } else {
            // 新增道具
            const newItem: UserItem = {
                userId,
                itemId,
                quantity,
                acquiredAt: Date.now()
            };
            await collection.insertOne(newItem);
        }

        console.log(`[ItemSystem] 用户 ${userId} 获得道具 ${itemId} x${quantity}`);

        return { success: true };
    }

    /**
     * 使用道具
     */
    static async useItem(
        userId: string,
        itemId: string
    ): Promise<{
        success: boolean;
        error?: string;
        effect?: ItemEffect;
        buffId?: string;
    }> {
        const config = this.getItemConfig(itemId);
        if (!config) {
            return { success: false, error: '道具不存在' };
        }

        // 检查是否拥有道具
        const collection = MongoDBService.getCollection<UserItem>('user_items');
        const userItem = await collection.findOne({ userId, itemId });

        if (!userItem || userItem.quantity <= 0) {
            return { success: false, error: '道具数量不足' };
        }

        // 检查冷却时间
        const usageCollection = MongoDBService.getCollection<ItemUsageRecord>('item_usage');
        const lastUsage = await usageCollection.findOne(
            { userId, itemId },
            { sort: { usedAt: -1 } }
        );

        if (lastUsage && lastUsage.cooldownEndsAt && lastUsage.cooldownEndsAt > Date.now()) {
            const remainingSeconds = Math.ceil((lastUsage.cooldownEndsAt - Date.now()) / 1000);
            return { success: false, error: `道具冷却中，剩余${remainingSeconds}秒` };
        }

        // 扣除道具
        await collection.updateOne(
            { userId, itemId },
            {
                $inc: { quantity: -1 },
                $set: { lastUsedAt: Date.now() }
            }
        );

        // 记录使用
        const now = Date.now();
        const usageRecord: ItemUsageRecord = {
            userId,
            itemId,
            usedAt: now,
            effectDuration: config.duration,
            cooldownEndsAt: now + config.cooldown * 1000
        };
        await usageCollection.insertOne(usageRecord);

        // 应用效果
        let buffId: string | undefined;

        if (config.effectType === ItemEffectType.Buff && config.duration) {
            // 应用Buff效果
            const buffType = this.mapItemTypeToBuff(config.type);
            if (buffType) {
                const buff = await BuffSystem.addBuff(
                    userId,
                    buffType,
                    config.duration,
                    config.effect
                );
                buffId = buff.buffId;
            }
        } else if (config.effectType === ItemEffectType.Instant) {
            // 即时效果由调用方处理（例如在Room服务器中推动金币）
            // 这里只返回效果参数
        }

        console.log(`[ItemSystem] 用户 ${userId} 使用道具 ${itemId}`);

        return {
            success: true,
            effect: config.effect,
            buffId
        };
    }

    /**
     * 将道具类型映射到Buff类型
     */
    private static mapItemTypeToBuff(itemType: ItemType): BuffType | null {
        const mapping: Record<ItemType, BuffType> = {
            [ItemType.Hammer]: BuffType.HammerPush,
            [ItemType.MultiplierCard]: BuffType.RewardMultiplier,
            [ItemType.MagnetCard]: BuffType.Magnet,
            [ItemType.LuckyCharm]: BuffType.LuckyCharm,
            [ItemType.SuperPusher]: BuffType.SuperPush
        };
        return mapping[itemType] || null;
    }

    /**
     * 检查道具是否在冷却中
     */
    static async isItemOnCooldown(
        userId: string,
        itemId: string
    ): Promise<{
        onCooldown: boolean;
        remainingSeconds?: number;
    }> {
        const usageCollection = MongoDBService.getCollection<ItemUsageRecord>('item_usage');
        const lastUsage = await usageCollection.findOne(
            { userId, itemId },
            { sort: { usedAt: -1 } }
        );

        if (!lastUsage || !lastUsage.cooldownEndsAt) {
            return { onCooldown: false };
        }

        const now = Date.now();
        if (lastUsage.cooldownEndsAt > now) {
            return {
                onCooldown: true,
                remainingSeconds: Math.ceil((lastUsage.cooldownEndsAt - now) / 1000)
            };
        }

        return { onCooldown: false };
    }

    /**
     * 获取用户所有道具的冷却状态
     */
    static async getUserItemCooldowns(userId: string): Promise<Record<string, number>> {
        const cooldowns: Record<string, number> = {};
        const items = await this.getUserItems(userId);

        for (const item of items) {
            const cooldownInfo = await this.isItemOnCooldown(userId, item.itemId);
            if (cooldownInfo.onCooldown && cooldownInfo.remainingSeconds) {
                cooldowns[item.itemId] = cooldownInfo.remainingSeconds;
            }
        }

        return cooldowns;
    }

    /**
     * 消耗道具（不触发效果，用于合成等）
     */
    static async consumeItem(
        userId: string,
        itemId: string,
        quantity: number = 1
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const collection = MongoDBService.getCollection<UserItem>('user_items');
        const userItem = await collection.findOne({ userId, itemId });

        if (!userItem || userItem.quantity < quantity) {
            return { success: false, error: '道具数量不足' };
        }

        if (userItem.quantity === quantity) {
            // 删除记录
            await collection.deleteOne({ userId, itemId });
        } else {
            // 减少数量
            await collection.updateOne(
                { userId, itemId },
                { $inc: { quantity: -quantity } }
            );
        }

        console.log(`[ItemSystem] 用户 ${userId} 消耗道具 ${itemId} x${quantity}`);

        return { success: true };
    }

    /**
     * 获取道具总数
     */
    static async getTotalItemCount(userId: string): Promise<number> {
        const items = await this.getUserItems(userId);
        return items.reduce((sum, item) => sum + item.quantity, 0);
    }

    /**
     * 按稀有度筛选道具
     */
    static getItemsByRarity(rarity: ItemRarity): ItemConfig[] {
        return Object.values(this.ITEM_CONFIGS).filter(item => item.rarity === rarity);
    }

    /**
     * 按类型筛选道具
     */
    static getItemsByType(type: ItemType): ItemConfig[] {
        return Object.values(this.ITEM_CONFIGS).filter(item => item.type === type);
    }
}
