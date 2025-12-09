/**
 * 🎰 抽奖系统
 *
 * 功能：
 * 1. 盲盒抽奖
 * 2. 概率算法
 * 3. 保底机制
 * 4. 稀有度控制
 */

import { ItemType, ItemRarity, InventoryItem, UserDB } from '../data/UserDB';

/** 奖池物品配置 */
export interface LootItem {
    itemId: string;
    itemName: string;
    itemType: ItemType;
    rarity: ItemRarity;
    weight: number;         // 权重（用于概率计算）
    quantity: number;       // 数量
}

/** 抽奖结果 */
export interface LotteryResult {
    success: boolean;
    item?: InventoryItem;
    isGuaranteed: boolean;  // 是否保底
    remainingTickets: number;
}

/** 抽奖配置 */
export interface LotteryConfig {
    name: string;           // 奖池名称
    ticketCost: number;     // 消耗彩票数量
    items: LootItem[];      // 奖池物品列表
    guaranteedPity: number; // 保底次数（如50次必出史诗+）
    legendaryPity: number;  // 传说保底次数（如100次必出传说）
}

/** 用户抽奖历史 */
interface UserLotteryHistory {
    userId: string;
    pullsSinceEpic: number;     // 距离上次史诗的次数
    pullsSinceLegendary: number;// 距离上次传说的次数
    totalPulls: number;         // 总抽奖次数
}

export class LotterySystem {
    // 内存缓存用户抽奖历史（生产环境应该存MongoDB）
    private static userHistoryMap = new Map<string, UserLotteryHistory>();

    /**
     * 默认抽奖配置（基础盲盒）
     */
    private static readonly DEFAULT_LOTTERY_CONFIG: LotteryConfig = {
        name: '基础盲盒',
        ticketCost: 1,
        guaranteedPity: 50,     // 50次必出史诗+
        legendaryPity: 100,     // 100次必出传说
        items: [
            // 普通物品（70%）
            {
                itemId: 'skin_common_1',
                itemName: '普通皮肤·蓝色',
                itemType: ItemType.Skin,
                rarity: ItemRarity.Common,
                weight: 40,
                quantity: 1
            },
            {
                itemId: 'prop_coin_small',
                itemName: '金币袋（小）',
                itemType: ItemType.Prop,
                rarity: ItemRarity.Common,
                weight: 30,
                quantity: 50
            },

            // 稀有物品（20%）
            {
                itemId: 'skin_rare_1',
                itemName: '稀有皮肤·紫色',
                itemType: ItemType.Skin,
                rarity: ItemRarity.Rare,
                weight: 15,
                quantity: 1
            },
            {
                itemId: 'prop_coin_medium',
                itemName: '金币袋（中）',
                itemType: ItemType.Prop,
                rarity: ItemRarity.Rare,
                weight: 5,
                quantity: 100
            },

            // 史诗物品（8%）
            {
                itemId: 'skin_epic_1',
                itemName: '史诗皮肤·橙色',
                itemType: ItemType.Skin,
                rarity: ItemRarity.Epic,
                weight: 6,
                quantity: 1
            },
            {
                itemId: 'prop_ticket',
                itemName: '彩票礼包',
                itemType: ItemType.Ticket,
                rarity: ItemRarity.Epic,
                weight: 2,
                quantity: 5
            },

            // 传说物品（2%）
            {
                itemId: 'nft_legendary_1',
                itemName: '传说NFT·金色',
                itemType: ItemType.NFT,
                rarity: ItemRarity.Legendary,
                weight: 1.5,
                quantity: 1
            },
            {
                itemId: 'prop_coin_large',
                itemName: '金币袋（大）',
                itemType: ItemType.Prop,
                rarity: ItemRarity.Legendary,
                weight: 0.5,
                quantity: 500
            }
        ]
    };

    /**
     * 执行抽奖
     */
    static async drawLottery(
        userId: string,
        config: LotteryConfig = this.DEFAULT_LOTTERY_CONFIG
    ): Promise<LotteryResult> {
        // 1. 检查彩票是否足够
        const user = await UserDB.getUserById(userId);
        if (!user || user.tickets < config.ticketCost) {
            return {
                success: false,
                isGuaranteed: false,
                remainingTickets: user?.tickets || 0
            };
        }

        // 2. 消耗彩票
        const consumed = await UserDB.consumeTickets(userId, config.ticketCost);
        if (!consumed) {
            return {
                success: false,
                isGuaranteed: false,
                remainingTickets: user.tickets
            };
        }

        // 3. 获取用户抽奖历史
        const history = this.getUserHistory(userId);
        history.totalPulls++;
        history.pullsSinceEpic++;
        history.pullsSinceLegendary++;

        // 4. 执行抽奖逻辑
        let item: LootItem;
        let isGuaranteed = false;

        // 检查传说保底
        if (history.pullsSinceLegendary >= config.legendaryPity) {
            item = this.getLegendaryItem(config);
            history.pullsSinceLegendary = 0;
            history.pullsSinceEpic = 0;
            isGuaranteed = true;
            console.log(`[Lottery] 用户 ${userId} 触发传说保底！`);
        }
        // 检查史诗保底
        else if (history.pullsSinceEpic >= config.guaranteedPity) {
            item = this.getEpicOrBetterItem(config);
            history.pullsSinceEpic = 0;
            if (item.rarity === ItemRarity.Legendary) {
                history.pullsSinceLegendary = 0;
            }
            isGuaranteed = true;
            console.log(`[Lottery] 用户 ${userId} 触发史诗保底！`);
        }
        // 普通抽奖
        else {
            item = this.rollRandomItem(config);
            // 重置计数器
            if (item.rarity === ItemRarity.Legendary) {
                history.pullsSinceLegendary = 0;
                history.pullsSinceEpic = 0;
            } else if (item.rarity === ItemRarity.Epic) {
                history.pullsSinceEpic = 0;
            }
        }

        // 5. 添加物品到背包
        const inventoryItem: InventoryItem = {
            itemId: item.itemId,
            itemName: item.itemName,
            itemType: item.itemType,
            rarity: item.rarity,
            quantity: item.quantity,
            obtainedAt: Date.now()
        };

        await UserDB.addItemToInventory(userId, inventoryItem);

        // 6. 更新历史记录
        this.userHistoryMap.set(userId, history);

        // 7. 返回结果
        const updatedUser = await UserDB.getUserById(userId);
        return {
            success: true,
            item: inventoryItem,
            isGuaranteed,
            remainingTickets: updatedUser?.tickets || 0
        };
    }

    /**
     * 权重随机抽取物品
     */
    private static rollRandomItem(config: LotteryConfig): LootItem {
        const totalWeight = config.items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of config.items) {
            random -= item.weight;
            if (random <= 0) {
                return item;
            }
        }

        // 兜底：返回第一个物品
        return config.items[0];
    }

    /**
     * 获取史诗或更好的物品
     */
    private static getEpicOrBetterItem(config: LotteryConfig): LootItem {
        const epicOrBetter = config.items.filter(
            item => item.rarity === ItemRarity.Epic || item.rarity === ItemRarity.Legendary
        );
        const totalWeight = epicOrBetter.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of epicOrBetter) {
            random -= item.weight;
            if (random <= 0) {
                return item;
            }
        }

        return epicOrBetter[0];
    }

    /**
     * 获取传说物品
     */
    private static getLegendaryItem(config: LotteryConfig): LootItem {
        const legendaryItems = config.items.filter(
            item => item.rarity === ItemRarity.Legendary
        );
        if (legendaryItems.length === 0) {
            // 如果没有传说物品，返回史诗
            return this.getEpicOrBetterItem(config);
        }

        const totalWeight = legendaryItems.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of legendaryItems) {
            random -= item.weight;
            if (random <= 0) {
                return item;
            }
        }

        return legendaryItems[0];
    }

    /**
     * 获取用户抽奖历史
     */
    private static getUserHistory(userId: string): UserLotteryHistory {
        if (!this.userHistoryMap.has(userId)) {
            this.userHistoryMap.set(userId, {
                userId,
                pullsSinceEpic: 0,
                pullsSinceLegendary: 0,
                totalPulls: 0
            });
        }
        return this.userHistoryMap.get(userId)!;
    }

    /**
     * 获取用户抽奖统计
     */
    static getUserStats(userId: string): UserLotteryHistory {
        return this.getUserHistory(userId);
    }

    /**
     * 计算各稀有度的概率
     */
    static calculateProbabilities(config: LotteryConfig = this.DEFAULT_LOTTERY_CONFIG): {
        common: number;
        rare: number;
        epic: number;
        legendary: number;
    } {
        const totalWeight = config.items.reduce((sum, item) => sum + item.weight, 0);

        const weightByRarity = {
            common: 0,
            rare: 0,
            epic: 0,
            legendary: 0
        };

        for (const item of config.items) {
            weightByRarity[item.rarity] += item.weight;
        }

        return {
            common: (weightByRarity.common / totalWeight) * 100,
            rare: (weightByRarity.rare / totalWeight) * 100,
            epic: (weightByRarity.epic / totalWeight) * 100,
            legendary: (weightByRarity.legendary / totalWeight) * 100
        };
    }

    /**
     * 获取用户收藏品（用于背包界面）
     */
    static async getUserInventory(userId: string): Promise<InventoryItem[]> {
        const user = await UserDB.getUserById(userId);
        return user?.inventory || [];
    }
}
