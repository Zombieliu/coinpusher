/**
 * 🎒 背包系统
 *
 * 功能：
 * 1. 背包管理（容量、扩展）
 * 2. 物品分类和筛选
 * 3. 物品排序
 * 4. 背包整理
 * 5. 物品快速使用
 * 6. 背包统计
 */

import { MongoDBService } from '../db/MongoDBService';
import { ItemSystem, ItemType, ItemRarity, ItemConfig } from './ItemSystem';
import { LotterySystem } from './LotterySystem';
import { InventoryItem } from '../data/UserDB';
import { ObjectId } from 'mongodb';

/** 背包分类 */
export enum InventoryCategory {
    All = 'all',                // 全部
    Consumable = 'consumable',  // 消耗品（道具）
    Collectible = 'collectible', // 收藏品（皮肤、装饰）
    Material = 'material'       // 材料
}

/** 排序方式 */
export enum SortType {
    Time = 'time',              // 按时间
    Rarity = 'rarity',          // 按稀有度
    Type = 'type',              // 按类型
    Quantity = 'quantity'       // 按数量
}

/** 背包配置 */
export interface InventoryConfig {
    _id?: ObjectId;
    userId: string;
    maxSlots: number;           // 最大格子数
    usedSlots: number;          // 已使用格子数
    expandCount: number;        // 已扩展次数
    lastExpanded?: number;      // 最后扩展时间
}

/** 背包物品（统一视图） */
export interface InventoryItemView {
    itemId: string;
    name: string;
    type: string;               // 'item' | 'collectible'
    category: InventoryCategory;
    rarity: ItemRarity;
    quantity: number;
    stackable: boolean;
    maxStack: number;
    canUse: boolean;            // 是否可使用
    acquiredAt: number;
    config?: ItemConfig | InventoryItem;
}

export class InventorySystem {
    /**
     * 默认背包容量
     */
    private static readonly DEFAULT_SLOTS = 50;

    /**
     * 每次扩展增加的格子数
     */
    private static readonly EXPAND_SLOTS = 10;

    /**
     * 最大背包容量
     */
    private static readonly MAX_SLOTS = 200;

    /**
     * 扩展背包费用（金币）
     */
    private static readonly EXPAND_COSTS = [
        100,   // 第1次扩展
        200,   // 第2次
        300,   // 第3次
        500,   // 第4次
        1000,  // 第5次
        2000,  // 第6次及以后
    ];

    /**
     * 获取用户背包配置
     */
    static async getInventoryConfig(userId: string): Promise<InventoryConfig> {
        const collection = MongoDBService.getCollection<InventoryConfig>('user_inventory_config');
        let config = await collection.findOne({ userId }) as InventoryConfig | null;

        if (!config) {
            config = {
                userId,
                maxSlots: this.DEFAULT_SLOTS,
                usedSlots: 0,
                expandCount: 0
            };
            await collection.insertOne(config);
        }

        return config;
    }

    /**
     * 获取完整背包（道具 + 收藏品）
     */
    static async getFullInventory(
        userId: string,
        category: InventoryCategory = InventoryCategory.All,
        sortType: SortType = SortType.Time
    ): Promise<{
        config: InventoryConfig;
        items: InventoryItemView[];
    }> {
        const config = await this.getInventoryConfig(userId);

        // 获取道具
        const userItems = await ItemSystem.getUserItems(userId);
        const itemViews: InventoryItemView[] = userItems.map(item => {
            const itemConfig = ItemSystem.getItemConfig(item.itemId);
            return {
                itemId: item.itemId,
                name: itemConfig?.name || 'Unknown',
                type: 'item',
                category: InventoryCategory.Consumable,
                rarity: itemConfig?.rarity || ItemRarity.Common,
                quantity: item.quantity,
                stackable: itemConfig?.stackable || false,
                maxStack: itemConfig?.maxStack || 1,
                canUse: true,
                acquiredAt: item.acquiredAt,
                config: itemConfig || undefined
            };
        });

        // 获取收藏品（从抽奖系统）
        const collectibles = await LotterySystem.getUserInventory(userId);
        const collectibleViews: InventoryItemView[] = collectibles.map(item => ({
            itemId: item.itemId,
            name: item.itemName,
            type: 'collectible',
            category: InventoryCategory.Collectible,
            rarity: item.rarity,
            quantity: item.quantity,
            stackable: true,
            maxStack: 99,
            canUse: false,
            acquiredAt: item.obtainedAt,
            config: item
        }));

        // 合并所有物品
        let allItems = [...itemViews, ...collectibleViews];

        // 按分类筛选
        if (category !== InventoryCategory.All) {
            allItems = allItems.filter(item => item.category === category);
        }

        // 排序
        allItems = this.sortItems(allItems, sortType);

        // 更新已使用格子数
        config.usedSlots = allItems.length;
        await this.updateInventoryConfig(userId, { usedSlots: allItems.length });

        return {
            config,
            items: allItems
        };
    }

    /**
     * 排序物品
     */
    private static sortItems(items: InventoryItemView[], sortType: SortType): InventoryItemView[] {
        const rarityOrder = {
            [ItemRarity.Legendary]: 4,
            [ItemRarity.Epic]: 3,
            [ItemRarity.Rare]: 2,
            [ItemRarity.Common]: 1
        };

        switch (sortType) {
            case SortType.Time:
                return items.sort((a, b) => b.acquiredAt - a.acquiredAt);

            case SortType.Rarity:
                return items.sort((a, b) => {
                    const diff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
                    return diff !== 0 ? diff : b.acquiredAt - a.acquiredAt;
                });

            case SortType.Type:
                return items.sort((a, b) => {
                    const typeCompare = a.type.localeCompare(b.type);
                    return typeCompare !== 0 ? typeCompare : b.acquiredAt - a.acquiredAt;
                });

            case SortType.Quantity:
                return items.sort((a, b) => b.quantity - a.quantity);

            default:
                return items;
        }
    }

    /**
     * 扩展背包
     */
    static async expandInventory(userId: string): Promise<{
        success: boolean;
        error?: string;
        newMaxSlots?: number;
        cost?: number;
    }> {
        const config = await this.getInventoryConfig(userId);

        // 检查是否已达上限
        if (config.maxSlots >= this.MAX_SLOTS) {
            return { success: false, error: '背包已达最大容量' };
        }

        // 计算费用
        const costIndex = Math.min(config.expandCount, this.EXPAND_COSTS.length - 1);
        const cost = this.EXPAND_COSTS[costIndex];

        // 检查金币
        const UserDB = (await import('../data/UserDB')).UserDB;
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (user.gold < cost) {
            return { success: false, error: `金币不足，需要 ${cost} 金币` };
        }

        // 扣除金币
        await UserDB.updateUser(userId, {
            gold: user.gold - cost
        });

        // 扩展背包
        const newMaxSlots = config.maxSlots + this.EXPAND_SLOTS;
        await this.updateInventoryConfig(userId, {
            maxSlots: newMaxSlots,
            expandCount: config.expandCount + 1,
            lastExpanded: Date.now()
        });

        console.log(`[InventorySystem] 用户 ${userId} 扩展背包到 ${newMaxSlots} 格，花费 ${cost} 金币`);

        return {
            success: true,
            newMaxSlots,
            cost
        };
    }

    /**
     * 获取扩展费用
     */
    static async getExpandCost(userId: string): Promise<number> {
        const config = await this.getInventoryConfig(userId);
        const costIndex = Math.min(config.expandCount, this.EXPAND_COSTS.length - 1);
        return this.EXPAND_COSTS[costIndex];
    }

    /**
     * 检查背包是否已满
     */
    static async isInventoryFull(userId: string): Promise<boolean> {
        const { config, items } = await this.getFullInventory(userId);
        return items.length >= config.maxSlots;
    }

    /**
     * 获取背包剩余空间
     */
    static async getRemainingSlots(userId: string): Promise<number> {
        const { config, items } = await this.getFullInventory(userId);
        return Math.max(0, config.maxSlots - items.length);
    }

    /**
     * 快速使用道具
     */
    static async quickUseItem(userId: string, itemId: string): Promise<{
        success: boolean;
        error?: string;
        effect?: any;
    }> {
        // 检查物品类型
        const itemConfig = ItemSystem.getItemConfig(itemId);
        if (!itemConfig) {
            return { success: false, error: '物品不存在' };
        }

        // 使用道具
        const result = await ItemSystem.useItem(userId, itemId);
        return result;
    }

    /**
     * 批量使用道具
     */
    static async batchUseItems(
        userId: string,
        items: Array<{ itemId: string; quantity: number }>
    ): Promise<{
        success: boolean;
        results: Array<{ itemId: string; success: boolean; error?: string }>;
    }> {
        const results: Array<{ itemId: string; success: boolean; error?: string }> = [];

        for (const { itemId, quantity } of items) {
            for (let i = 0; i < quantity; i++) {
                const result = await ItemSystem.useItem(userId, itemId);
                results.push({
                    itemId,
                    success: result.success,
                    error: result.error
                });

                if (!result.success) {
                    break; // 失败则停止该物品的批量使用
                }
            }
        }

        const allSuccess = results.every(r => r.success);

        return {
            success: allSuccess,
            results
        };
    }

    /**
     * 背包统计
     */
    static async getInventoryStats(userId: string): Promise<{
        totalItems: number;
        usedSlots: number;
        maxSlots: number;
        usageRate: number;
        itemsByRarity: { [rarity: string]: number };
        itemsByType: { [type: string]: number };
    }> {
        const { config, items } = await this.getFullInventory(userId);

        const itemsByRarity: Record<ItemRarity, number> = {
            [ItemRarity.Common]: 0,
            [ItemRarity.Rare]: 0,
            [ItemRarity.Epic]: 0,
            [ItemRarity.Legendary]: 0
        };

        const itemsByType: Record<string, number> = {};

        let totalItems = 0;
        for (const item of items) {
            totalItems += item.quantity;
            itemsByRarity[item.rarity] += item.quantity;
            itemsByType[item.type] = (itemsByType[item.type] || 0) + item.quantity;
        }

        return {
            totalItems,
            usedSlots: config.usedSlots,
            maxSlots: config.maxSlots,
            usageRate: config.maxSlots > 0 ? (config.usedSlots / config.maxSlots) * 100 : 0,
            itemsByRarity,
            itemsByType
        };
    }

    /**
     * 更新背包配置
     */
    private static async updateInventoryConfig(
        userId: string,
        updates: Partial<InventoryConfig>
    ): Promise<void> {
        const collection = MongoDBService.getCollection<InventoryConfig>('user_inventory_config');
        await collection.updateOne(
            { userId },
            { $set: updates },
            { upsert: true }
        );
    }

    /**
     * 搜索物品
     */
    static async searchItems(userId: string, keyword: string): Promise<InventoryItemView[]> {
        const { items } = await this.getFullInventory(userId);
        const lowerKeyword = keyword.toLowerCase();

        return items.filter(item =>
            item.name.toLowerCase().includes(lowerKeyword) ||
            item.itemId.toLowerCase().includes(lowerKeyword)
        );
    }

    /**
     * 获取特定稀有度的物品
     */
    static async getItemsByRarity(userId: string, rarity: ItemRarity): Promise<InventoryItemView[]> {
        const { items } = await this.getFullInventory(userId);
        return items.filter(item => item.rarity === rarity);
    }

    /**
     * 检查是否拥有特定物品
     */
    static async hasItem(userId: string, itemId: string): Promise<boolean> {
        const { items } = await this.getFullInventory(userId);
        return items.some(item => item.itemId === itemId && item.quantity > 0);
    }

    /**
     * 获取物品数量
     */
    static async getItemQuantity(userId: string, itemId: string): Promise<number> {
        const { items } = await this.getFullInventory(userId);
        const item = items.find(i => i.itemId === itemId);
        return item?.quantity || 0;
    }
}
