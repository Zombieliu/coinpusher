/**
 * 🎁 推币奖励系统
 *
 * 功能：
 * 1. 小奖/大奖/超级大奖机制
 * 2. Jackpot系统（保底机制）
 * 3. 彩票发放
 * 4. 奖励概率计算
 */

import { UserDB } from '../data/UserDB';
import { RewardLimitDB } from '../data/RewardLimitDB';

/** 奖励类型 */
export enum RewardType {
    None = 'none',              // 无奖励
    SmallPrize = 'small',       // 小奖
    BigPrize = 'big',           // 大奖
    SuperPrize = 'super',       // 超级大奖
    Jackpot = 'jackpot'         // Jackpot大奖
}

/** 奖励结果 */
export interface RewardResult {
    type: RewardType;
    goldReward: number;         // 金币奖励
    ticketReward: number;       // 彩票奖励
    multiplier: number;         // 倍率
    jackpotProgress: number;    // Jackpot进度（0-100）
    message: string;            // 奖励消息
    shouldBroadcast: boolean;   // 是否全服广播
}

/** 奖励配置 */
export interface RewardConfig {
    // 概率配置（百分比）
    smallPrizeProbability: number;      // 小奖概率（默认5%）
    bigPrizeProbability: number;        // 大奖概率（默认1%）
    superPrizeProbability: number;      // 超级大奖概率（默认0.05%）

    // 奖励金额范围
    smallPrizeGold: [number, number];   // 小奖金币范围
    bigPrizeGold: [number, number];     // 大奖金币范围
    superPrizeGold: [number, number];   // 超级大奖金币范围
    jackpotGold: [number, number];      // Jackpot金币范围

    // 彩票奖励
    bigPrizeTickets: number;            // 大奖彩票数量
    superPrizeTickets: number;          // 超级大奖彩票数量
    jackpotTickets: number;             // Jackpot彩票数量

    // Jackpot配置
    jackpotProgressPerDrop: number;     // 每次投币增加的进度
    jackpotThreshold: number;           // Jackpot触发阈值（默认100）
}

export class RewardSystem {
    /**
     * 默认奖励配置
     */
    private static readonly DEFAULT_CONFIG: RewardConfig = {
        // 概率配置
        smallPrizeProbability: 5.0,      // 5%
        bigPrizeProbability: 1.0,        // 1%
        superPrizeProbability: 0.05,     // 0.05% (1/2000)

        // 金币范围
        smallPrizeGold: [30, 100],
        bigPrizeGold: [200, 500],
        superPrizeGold: [1000, 2500],
        jackpotGold: [3000, 5000],

        // 彩票奖励
        bigPrizeTickets: 1,
        superPrizeTickets: 5,
        jackpotTickets: 10,

        // Jackpot配置
        jackpotProgressPerDrop: 0.2,     // 每次投币增加0.2进度
        jackpotThreshold: 100            // 100进度触发（即500次投币）
    };

    /**
     * 计算单次投币奖励
     */
    static async calculateReward(
        userId: string,
        config: RewardConfig = this.DEFAULT_CONFIG
    ): Promise<RewardResult> {
        // 1. 更新Jackpot进度
        const newProgress = await UserDB.updateJackpotProgress(
            userId,
            config.jackpotProgressPerDrop
        );

        // 2. 检查是否触发Jackpot（保底）
        if (newProgress >= config.jackpotThreshold) {
            console.log(`[Reward] 用户 ${userId} 触发 Jackpot！进度：${newProgress}`);
            await UserDB.resetJackpotProgress(userId);
            return this.createJackpotReward(config);
        }

        // 3. 随机抽取奖励
        const random = Math.random() * 100;

        // 超级大奖（最稀有）
        if (random < config.superPrizeProbability) {
            console.log(`[Reward] 用户 ${userId} 获得超级大奖！概率：${random.toFixed(4)}%`);
            return this.createSuperPrizeReward(config, newProgress);
        }

        // 大奖
        if (random < config.bigPrizeProbability) {
            console.log(`[Reward] 用户 ${userId} 获得大奖！概率：${random.toFixed(2)}%`);
            return this.createBigPrizeReward(config, newProgress);
        }

        // 小奖
        if (random < config.smallPrizeProbability) {
            return this.createSmallPrizeReward(config, newProgress);
        }

        // 无奖励
        return {
            type: RewardType.None,
            goldReward: 0,
            ticketReward: 0,
            multiplier: 1.0,
            jackpotProgress: newProgress,
            message: '继续努力！',
            shouldBroadcast: false
        };
    }

    /**
     * 发放奖励
     */
    static async grantReward(
        userId: string,
        reward: RewardResult
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // 1. 检查每日奖励限额
            if (reward.goldReward > 0) {
                const limitCheck = await RewardLimitDB.checkLimit(userId, reward.goldReward);
                if (!limitCheck.allowed) {
                    return {
                        success: false,
                        error: `每日奖励已达上限 ${limitCheck.limit}，剩余：${limitCheck.remaining}`
                    };
                }
            }

            // 2. 发放金币
            if (reward.goldReward > 0) {
                const user = await UserDB.getUserById(userId);
                if (!user) {
                    return { success: false, error: '用户不存在' };
                }

                await UserDB.updateUser(userId, {
                    gold: user.gold + reward.goldReward,
                    totalRewards: (user.totalRewards || 0) + reward.goldReward,
                    lastRewardTime: Date.now()
                });

                // 更新奖励限额
                await RewardLimitDB.addReward(userId, reward.goldReward);
            }

            // 3. 发放彩票
            if (reward.ticketReward > 0) {
                await UserDB.addTickets(userId, reward.ticketReward);
            }

            return { success: true };
        } catch (error) {
            console.error('[RewardSystem] 发放奖励失败:', error);
            return { success: false, error: '发放奖励失败' };
        }
    }

    /**
     * 创建小奖奖励
     */
    private static createSmallPrizeReward(
        config: RewardConfig,
        jackpotProgress: number
    ): RewardResult {
        const gold = this.randomInRange(config.smallPrizeGold);
        return {
            type: RewardType.SmallPrize,
            goldReward: gold,
            ticketReward: 0,
            multiplier: 1.0,
            jackpotProgress,
            message: `🎉 小奖！获得 ${gold} 金币`,
            shouldBroadcast: false
        };
    }

    /**
     * 创建大奖奖励
     */
    private static createBigPrizeReward(
        config: RewardConfig,
        jackpotProgress: number
    ): RewardResult {
        const gold = this.randomInRange(config.bigPrizeGold);
        return {
            type: RewardType.BigPrize,
            goldReward: gold,
            ticketReward: config.bigPrizeTickets,
            multiplier: 1.5,
            jackpotProgress,
            message: `🎊 大奖！获得 ${gold} 金币 + ${config.bigPrizeTickets} 彩票`,
            shouldBroadcast: false
        };
    }

    /**
     * 创建超级大奖奖励
     */
    private static createSuperPrizeReward(
        config: RewardConfig,
        jackpotProgress: number
    ): RewardResult {
        const gold = this.randomInRange(config.superPrizeGold);
        return {
            type: RewardType.SuperPrize,
            goldReward: gold,
            ticketReward: config.superPrizeTickets,
            multiplier: 2.0,
            jackpotProgress,
            message: `💎 超级大奖！获得 ${gold} 金币 + ${config.superPrizeTickets} 彩票`,
            shouldBroadcast: true  // 全服广播
        };
    }

    /**
     * 创建Jackpot奖励
     */
    private static createJackpotReward(config: RewardConfig): RewardResult {
        const gold = this.randomInRange(config.jackpotGold);
        return {
            type: RewardType.Jackpot,
            goldReward: gold,
            ticketReward: config.jackpotTickets,
            multiplier: 3.0,
            jackpotProgress: 0, // 重置
            message: `🏆 JACKPOT！！！获得 ${gold} 金币 + ${config.jackpotTickets} 彩票`,
            shouldBroadcast: true  // 全服广播
        };
    }

    /**
     * 随机范围内的数值
     */
    private static randomInRange(range: [number, number]): number {
        return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    }

    /**
     * 获取奖励配置信息（供客户端显示）
     */
    static getRewardInfo(config: RewardConfig = this.DEFAULT_CONFIG): {
        probabilities: {
            small: string;
            big: string;
            super: string;
            jackpot: string;
        };
        rewards: {
            small: string;
            big: string;
            super: string;
            jackpot: string;
        };
    } {
        return {
            probabilities: {
                small: `${config.smallPrizeProbability}%`,
                big: `${config.bigPrizeProbability}%`,
                super: `${config.superPrizeProbability}%`,
                jackpot: `保底 ${config.jackpotThreshold} 次`
            },
            rewards: {
                small: `${config.smallPrizeGold[0]}-${config.smallPrizeGold[1]} 金币`,
                big: `${config.bigPrizeGold[0]}-${config.bigPrizeGold[1]} 金币 + ${config.bigPrizeTickets} 彩票`,
                super: `${config.superPrizeGold[0]}-${config.superPrizeGold[1]} 金币 + ${config.superPrizeTickets} 彩票`,
                jackpot: `${config.jackpotGold[0]}-${config.jackpotGold[1]} 金币 + ${config.jackpotTickets} 彩票`
            }
        };
    }

    /**
     * 计算预期收益（EV - Expected Value）
     */
    static calculateExpectedValue(config: RewardConfig = this.DEFAULT_CONFIG): number {
        const smallEV = (config.smallPrizeProbability / 100) *
            (config.smallPrizeGold[0] + config.smallPrizeGold[1]) / 2;

        const bigEV = (config.bigPrizeProbability / 100) *
            (config.bigPrizeGold[0] + config.bigPrizeGold[1]) / 2;

        const superEV = (config.superPrizeProbability / 100) *
            (config.superPrizeGold[0] + config.superPrizeGold[1]) / 2;

        // Jackpot保底（每500次触发一次）
        const jackpotEV = (1 / (config.jackpotThreshold / config.jackpotProgressPerDrop)) *
            (config.jackpotGold[0] + config.jackpotGold[1]) / 2;

        return smallEV + bigEV + superEV + jackpotEV;
    }
}
