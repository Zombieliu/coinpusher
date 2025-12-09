/**
 * 🏆 成就系统
 *
 * 功能：
 * 1. 成就解锁
 * 2. 进度追踪
 * 3. 成就奖励
 * 4. 成就称号
 */

import { UserDB } from '../data/UserDB';
import { TaskReward } from './TaskSystem';

/** 成就类型 */
export enum AchievementCategory {
    Beginner = 'beginner',     // 新手成就
    Drop = 'drop',             // 投币成就
    Prize = 'prize',           // 奖励成就
    Lottery = 'lottery',       // 抽奖成就
    Wealth = 'wealth',         // 财富成就
    Social = 'social',         // 社交成就
    Master = 'master'          // 大师成就
}

/** 成就状态 */
export enum AchievementStatus {
    Locked = 'locked',         // 未解锁
    InProgress = 'in_progress',// 进行中
    Unlocked = 'unlocked',     // 已解锁
    Claimed = 'claimed'        // 已领取
}

/** 成就配置 */
export interface AchievementConfig {
    achievementId: string;     // 成就ID
    category: AchievementCategory; // 成就类别
    name: string;              // 成就名称
    description: string;       // 成就描述
    icon: string;              // 成就图标
    goalValue: number;         // 目标值
    reward: TaskReward;        // 奖励
    title?: string;            // 解锁称号
    order: number;             // 排序
    hidden?: boolean;          // 是否隐藏（神秘成就）
}

/** 用户成就 */
export interface UserAchievement {
    achievementId: string;
    category: AchievementCategory;
    status: AchievementStatus;
    currentProgress: number;
    goalValue: number;
    unlockedAt?: number;       // 解锁时间
    claimedAt?: number;        // 领取时间
}

export class AchievementSystem {
    /**
     * 成就配置列表
     */
    private static readonly ACHIEVEMENTS: AchievementConfig[] = [
        // === 新手成就 ===
        {
            achievementId: 'beginner_first_drop',
            category: AchievementCategory.Beginner,
            name: '初次尝试',
            description: '进行第一次投币',
            icon: '🎯',
            goalValue: 1,
            reward: { gold: 50, exp: 10 },
            order: 1
        },
        {
            achievementId: 'beginner_10_drops',
            category: AchievementCategory.Beginner,
            name: '推币新手',
            description: '累计投币10次',
            icon: '🎲',
            goalValue: 10,
            reward: { gold: 100, exp: 20 },
            title: '新手玩家',
            order: 2
        },

        // === 投币成就 ===
        {
            achievementId: 'drop_100',
            category: AchievementCategory.Drop,
            name: '百次投币',
            description: '累计投币100次',
            icon: '💰',
            goalValue: 100,
            reward: { gold: 300, tickets: 1, exp: 50 },
            order: 3
        },
        {
            achievementId: 'drop_1000',
            category: AchievementCategory.Drop,
            name: '推币达人',
            description: '累计投币1000次',
            icon: '🎰',
            goalValue: 1000,
            reward: { gold: 1000, tickets: 5, exp: 100 },
            title: '推币达人',
            order: 4
        },
        {
            achievementId: 'drop_10000',
            category: AchievementCategory.Drop,
            name: '推币大师',
            description: '累计投币10000次',
            icon: '🏆',
            goalValue: 10000,
            reward: { gold: 5000, tickets: 20, exp: 500 },
            title: '推币大师',
            order: 5
        },

        // === 奖励成就 ===
        {
            achievementId: 'prize_first_small',
            category: AchievementCategory.Prize,
            name: '小试牛刀',
            description: '获得第一次小奖',
            icon: '🎉',
            goalValue: 1,
            reward: { gold: 100, exp: 20 },
            order: 6
        },
        {
            achievementId: 'prize_small_10',
            category: AchievementCategory.Prize,
            name: '小奖收集者',
            description: '获得10次小奖',
            icon: '🎊',
            goalValue: 10,
            reward: { gold: 300, tickets: 2, exp: 50 },
            order: 7
        },
        {
            achievementId: 'prize_first_big',
            category: AchievementCategory.Prize,
            name: '大奖初体验',
            description: '获得第一次大奖',
            icon: '💎',
            goalValue: 1,
            reward: { gold: 200, tickets: 1, exp: 30 },
            order: 8
        },
        {
            achievementId: 'prize_big_10',
            category: AchievementCategory.Prize,
            name: '大奖猎人',
            description: '获得10次大奖',
            icon: '🎁',
            goalValue: 10,
            reward: { gold: 1000, tickets: 5, exp: 100 },
            title: '大奖猎人',
            order: 9
        },
        {
            achievementId: 'prize_super_1',
            category: AchievementCategory.Prize,
            name: '超级大奖',
            description: '获得一次超级大奖',
            icon: '💰',
            goalValue: 1,
            reward: { gold: 500, tickets: 3, exp: 80 },
            order: 10
        },
        {
            achievementId: 'prize_jackpot_1',
            category: AchievementCategory.Prize,
            name: 'Jackpot大赢家',
            description: '触发一次Jackpot',
            icon: '🏆',
            goalValue: 1,
            reward: { gold: 1000, tickets: 10, exp: 200 },
            title: 'Jackpot大赢家',
            order: 11
        },

        // === 抽奖成就 ===
        {
            achievementId: 'lottery_10',
            category: AchievementCategory.Lottery,
            name: '抽奖爱好者',
            description: '抽奖10次',
            icon: '🎰',
            goalValue: 10,
            reward: { gold: 200, tickets: 2, exp: 40 },
            order: 12
        },
        {
            achievementId: 'lottery_epic_1',
            category: AchievementCategory.Lottery,
            name: '史诗收藏家',
            description: '抽到史诗物品',
            icon: '🟣',
            goalValue: 1,
            reward: { gold: 500, tickets: 3, exp: 80 },
            order: 13
        },
        {
            achievementId: 'lottery_legendary_1',
            category: AchievementCategory.Lottery,
            name: '传说拥有者',
            description: '抽到传说物品',
            icon: '🟠',
            goalValue: 1,
            reward: { gold: 1000, tickets: 10, exp: 200 },
            title: '传说拥有者',
            order: 14
        },

        // === 财富成就 ===
        {
            achievementId: 'wealth_1000',
            category: AchievementCategory.Wealth,
            name: '小富即安',
            description: '拥有1000金币',
            icon: '💵',
            goalValue: 1000,
            reward: { gold: 200, exp: 30 },
            order: 15
        },
        {
            achievementId: 'wealth_10000',
            category: AchievementCategory.Wealth,
            name: '腰缠万贯',
            description: '拥有10000金币',
            icon: '💰',
            goalValue: 10000,
            reward: { gold: 1000, tickets: 5, exp: 100 },
            title: '富甲一方',
            order: 16
        },
        {
            achievementId: 'wealth_100000',
            category: AchievementCategory.Wealth,
            name: '富可敌国',
            description: '拥有100000金币',
            icon: '👑',
            goalValue: 100000,
            reward: { gold: 10000, tickets: 50, exp: 1000 },
            title: '富可敌国',
            order: 17
        },

        // === 大师成就 ===
        {
            achievementId: 'master_all_beginner',
            category: AchievementCategory.Master,
            name: '新手毕业',
            description: '完成所有新手成就',
            icon: '🎓',
            goalValue: 2,
            reward: { gold: 500, tickets: 3, exp: 100 },
            title: '新手毕业生',
            order: 18
        },
        {
            achievementId: 'master_10_achievements',
            category: AchievementCategory.Master,
            name: '成就收集者',
            description: '解锁10个成就',
            icon: '🏅',
            goalValue: 10,
            reward: { gold: 1000, tickets: 5, exp: 150 },
            title: '成就收集者',
            order: 19
        },
        {
            achievementId: 'master_all_achievements',
            category: AchievementCategory.Master,
            name: '完美主义者',
            description: '解锁所有成就',
            icon: '⭐',
            goalValue: 20,
            reward: { gold: 10000, tickets: 100, exp: 1000 },
            title: '完美主义者',
            order: 20,
            hidden: true
        }
    ];

    /**
     * 内存存储（生产环境应使用MongoDB）
     */
    private static userAchievementsMap = new Map<string, UserAchievement[]>();

    /**
     * 获取用户成就列表
     */
    static getUserAchievements(userId: string): UserAchievement[] {
        let achievements = this.userAchievementsMap.get(userId);

        if (!achievements) {
            // 初始化用户成就
            achievements = this.ACHIEVEMENTS.map(config => ({
                achievementId: config.achievementId,
                category: config.category,
                status: AchievementStatus.Locked,
                currentProgress: 0,
                goalValue: config.goalValue
            }));
            this.userAchievementsMap.set(userId, achievements);
        }

        return achievements;
    }

    /**
     * 更新成就进度
     */
    static async updateAchievementProgress(
        userId: string,
        achievementId: string,
        progress: number,
        absolute: boolean = true
    ): Promise<UserAchievement | null> {
        const achievements = this.getUserAchievements(userId);
        const achievement = achievements.find(a => a.achievementId === achievementId);

        if (!achievement) {
            return null;
        }

        // 已解锁的成就不再更新
        if (achievement.status === AchievementStatus.Unlocked ||
            achievement.status === AchievementStatus.Claimed) {
            return achievement;
        }

        // 更新进度
        if (absolute) {
            achievement.currentProgress = progress;
        } else {
            achievement.currentProgress += progress;
        }

        achievement.status = AchievementStatus.InProgress;

        // 检查是否完成
        if (achievement.currentProgress >= achievement.goalValue) {
            achievement.status = AchievementStatus.Unlocked;
            achievement.unlockedAt = Date.now();

            const config = this.ACHIEVEMENTS.find(a => a.achievementId === achievementId);
            console.log(`[AchievementSystem] 🏆 用户 ${userId} 解锁成就：${config?.name}`);

            return achievement;
        }

        return null;
    }

    /**
     * 领取成就奖励
     */
    static async claimAchievementReward(userId: string, achievementId: string): Promise<{
        success: boolean;
        reward?: TaskReward;
        title?: string;
        error?: string;
    }> {
        const achievements = this.getUserAchievements(userId);
        const achievement = achievements.find(a => a.achievementId === achievementId);

        if (!achievement) {
            return { success: false, error: '成就不存在' };
        }

        if (achievement.status === AchievementStatus.Claimed) {
            return { success: false, error: '奖励已领取' };
        }

        if (achievement.status !== AchievementStatus.Unlocked) {
            return { success: false, error: '成就未解锁' };
        }

        // 获取成就配置
        const config = this.ACHIEVEMENTS.find(a => a.achievementId === achievementId);
        if (!config) {
            return { success: false, error: '成就配置不存在' };
        }

        // 发放奖励
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        await UserDB.updateUser(userId, {
            gold: user.gold + (config.reward.gold || 0)
        });

        if (config.reward.tickets) {
            await UserDB.addTickets(userId, config.reward.tickets);
        }

        // 更新成就状态
        achievement.status = AchievementStatus.Claimed;
        achievement.claimedAt = Date.now();

        console.log(`[AchievementSystem] 用户 ${userId} 领取成就奖励：${config.name}`);

        return {
            success: true,
            reward: config.reward,
            title: config.title
        };
    }

    /**
     * 根据类型获取成就
     */
    static getAchievementsByCategory(
        userId: string,
        category: AchievementCategory
    ): UserAchievement[] {
        const achievements = this.getUserAchievements(userId);
        return achievements.filter(a => a.category === category);
    }

    /**
     * 获取成就统计
     */
    static getAchievementStats(userId: string): {
        total: number;
        unlocked: number;
        claimed: number;
        inProgress: number;
        completion: number;
    } {
        const achievements = this.getUserAchievements(userId);

        const unlocked = achievements.filter(a =>
            a.status === AchievementStatus.Unlocked ||
            a.status === AchievementStatus.Claimed
        ).length;

        const claimed = achievements.filter(a =>
            a.status === AchievementStatus.Claimed
        ).length;

        const inProgress = achievements.filter(a =>
            a.status === AchievementStatus.InProgress
        ).length;

        return {
            total: achievements.length,
            unlocked,
            claimed,
            inProgress,
            completion: (unlocked / achievements.length) * 100
        };
    }

    /**
     * 获取可见的成就列表（过滤隐藏成就）
     */
    static getVisibleAchievements(userId: string): UserAchievement[] {
        const achievements = this.getUserAchievements(userId);
        const visibleIds = this.ACHIEVEMENTS
            .filter(a => !a.hidden || achievements.find(ua => ua.achievementId === a.achievementId && ua.status !== AchievementStatus.Locked))
            .map(a => a.achievementId);

        return achievements.filter(a => visibleIds.includes(a.achievementId));
    }

    /**
     * 获取成就详情配置
     */
    static getAchievementConfig(achievementId: string): AchievementConfig | undefined {
        return this.ACHIEVEMENTS.find(a => a.achievementId === achievementId);
    }

    /**
     * 批量检查成就条件（用于数据变化时触发）
     */
    static async checkAchievements(userId: string, stats: {
        totalDrops?: number;
        smallPrizes?: number;
        bigPrizes?: number;
        superPrizes?: number;
        jackpots?: number;
        lotteryCount?: number;
        epicItems?: number;
        legendaryItems?: number;
        currentGold?: number;
    }): Promise<UserAchievement[]> {
        const unlockedAchievements: UserAchievement[] = [];

        // 投币成就
        if (stats.totalDrops !== undefined) {
            const dropAchievements = [
                'beginner_first_drop',
                'beginner_10_drops',
                'drop_100',
                'drop_1000',
                'drop_10000'
            ];
            for (const id of dropAchievements) {
                const result = await this.updateAchievementProgress(userId, id, stats.totalDrops, true);
                if (result) unlockedAchievements.push(result);
            }
        }

        // 小奖成就
        if (stats.smallPrizes !== undefined) {
            const smallPrizeAchievements = ['prize_first_small', 'prize_small_10'];
            for (const id of smallPrizeAchievements) {
                const result = await this.updateAchievementProgress(userId, id, stats.smallPrizes, true);
                if (result) unlockedAchievements.push(result);
            }
        }

        // 大奖成就
        if (stats.bigPrizes !== undefined) {
            const bigPrizeAchievements = ['prize_first_big', 'prize_big_10'];
            for (const id of bigPrizeAchievements) {
                const result = await this.updateAchievementProgress(userId, id, stats.bigPrizes, true);
                if (result) unlockedAchievements.push(result);
            }
        }

        // 超级大奖成就
        if (stats.superPrizes !== undefined) {
            const result = await this.updateAchievementProgress(userId, 'prize_super_1', stats.superPrizes, true);
            if (result) unlockedAchievements.push(result);
        }

        // Jackpot成就
        if (stats.jackpots !== undefined) {
            const result = await this.updateAchievementProgress(userId, 'prize_jackpot_1', stats.jackpots, true);
            if (result) unlockedAchievements.push(result);
        }

        // 抽奖成就
        if (stats.lotteryCount !== undefined) {
            const result = await this.updateAchievementProgress(userId, 'lottery_10', stats.lotteryCount, true);
            if (result) unlockedAchievements.push(result);
        }

        if (stats.epicItems !== undefined) {
            const result = await this.updateAchievementProgress(userId, 'lottery_epic_1', stats.epicItems, true);
            if (result) unlockedAchievements.push(result);
        }

        if (stats.legendaryItems !== undefined) {
            const result = await this.updateAchievementProgress(userId, 'lottery_legendary_1', stats.legendaryItems, true);
            if (result) unlockedAchievements.push(result);
        }

        // 财富成就
        if (stats.currentGold !== undefined) {
            const wealthAchievements = ['wealth_1000', 'wealth_10000', 'wealth_100000'];
            for (const id of wealthAchievements) {
                const result = await this.updateAchievementProgress(userId, id, stats.currentGold, true);
                if (result) unlockedAchievements.push(result);
            }
        }

        return unlockedAchievements;
    }
}
