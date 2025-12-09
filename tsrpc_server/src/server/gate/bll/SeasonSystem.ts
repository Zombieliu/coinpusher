/**
 * 🎫 赛季系统 & Battle Pass
 *
 * 功能：
 * 1. 赛季管理（30天一个赛季）
 * 2. 经验系统
 * 3. 等级系统（1-50级）
 * 4. Battle Pass（免费+付费双轨奖励）
 * 5. 倍率解锁
 */

import { UserDB, ItemType, ItemRarity, InventoryItem } from '../data/UserDB';
import { TaskReward } from './TaskSystem';
import { MailSystem, MailType } from './MailSystem';

/** 赛季状态 */
export enum SeasonStatus {
    Active = 'active',         // 进行中
    Ended = 'ended',           // 已结束
    Upcoming = 'upcoming'      // 即将开始
}

/** Battle Pass类型 */
export enum BattlePassType {
    Free = 'free',             // 免费轨道
    Premium = 'premium'        // 高级轨道（付费）
}

/** 赛季配置 */
export interface SeasonConfig {
    seasonId: string;          // 赛季ID（例如：season_1）
    seasonNumber: number;      // 赛季编号
    name: string;              // 赛季名称
    theme: string;             // 赛季主题
    startTime: number;         // 开始时间
    endTime: number;           // 结束时间
    status: SeasonStatus;
    maxLevel: number;          // 最大等级（默认50）
}

/** 等级奖励配置 */
export interface LevelReward {
    level: number;
    freeReward?: TaskReward;   // 免费奖励
    premiumReward?: TaskReward;// 高级奖励
}

/** 用户赛季数据 */
export interface UserSeasonData {
    userId: string;
    seasonId: string;
    level: number;             // 当前等级
    exp: number;               // 当前经验
    expToNext: number;         // 升级所需经验
    hasPremiumPass: boolean;   // 是否拥有高级通行证
    claimedFreeRewards: number[];    // 已领取的免费奖励等级
    claimedPremiumRewards: number[]; // 已领取的高级奖励等级
    multiplier: number;        // 当前倍率
}

export class SeasonSystem {
    /**
     * 当前赛季配置
     */
    private static currentSeason: SeasonConfig = {
        seasonId: 'season_1',
        seasonNumber: 1,
        name: '推币狂潮',
        theme: 'Coin Rush',
        startTime: Date.now(),
        endTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天后
        status: SeasonStatus.Active,
        maxLevel: 50
    };

    /**
     * 经验曲线配置（每级所需经验）
     */
    private static readonly EXP_CURVE = [
        100,   // L1 -> L2
        150,   // L2 -> L3
        200,   // L3 -> L4
        250,   // L4 -> L5
        300,   // L5 -> L6
        350,   // L6 -> L7
        400,   // L7 -> L8
        450,   // L8 -> L9
        500,   // L9 -> L10
        600,   // L10+  按公式计算
    ];

    /**
     * 倍率解锁配置
     */
    private static readonly MULTIPLIER_UNLOCKS: Array<{ level: number; multiplier: number }> = [
        { level: 1, multiplier: 1.0 },
        { level: 5, multiplier: 1.2 },
        { level: 10, multiplier: 1.5 },
        { level: 20, multiplier: 2.0 },
        { level: 30, multiplier: 2.5 },
        { level: 50, multiplier: 3.0 }
    ];

    /**
     * Battle Pass奖励配置
     */
    private static readonly LEVEL_REWARDS: LevelReward[] = [
        // 1-10级
        { level: 1, freeReward: { gold: 100, exp: 0 }, premiumReward: { gold: 200, tickets: 1 } },
        { level: 2, freeReward: { gold: 150 }, premiumReward: { gold: 300, tickets: 2 } },
        { level: 3, freeReward: { gold: 200 }, premiumReward: { gold: 400, tickets: 2 } },
        { level: 4, freeReward: { gold: 250 }, premiumReward: { gold: 500, tickets: 3 } },
        { level: 5, freeReward: { gold: 300, tickets: 1 }, premiumReward: { gold: 600, tickets: 5 } },
        { level: 6, freeReward: { gold: 350 }, premiumReward: { gold: 700, tickets: 5 } },
        { level: 7, freeReward: { gold: 400 }, premiumReward: { gold: 800, tickets: 5 } },
        { level: 8, freeReward: { gold: 450 }, premiumReward: { gold: 900, tickets: 5 } },
        { level: 9, freeReward: { gold: 500 }, premiumReward: { gold: 1000, tickets: 10 } },
        { level: 10, freeReward: { gold: 600, tickets: 2 }, premiumReward: { gold: 1200, tickets: 15 } },

        // 11-20级
        { level: 15, freeReward: { gold: 800, tickets: 2 }, premiumReward: { gold: 1600, tickets: 20 } },
        { level: 20, freeReward: { gold: 1000, tickets: 5 }, premiumReward: { gold: 2000, tickets: 30 } },

        // 21-30级
        { level: 25, freeReward: { gold: 1200, tickets: 5 }, premiumReward: { gold: 2500, tickets: 40 } },
        { level: 30, freeReward: { gold: 1500, tickets: 10 }, premiumReward: { gold: 3000, tickets: 50 } },

        // 31-40级
        { level: 35, freeReward: { gold: 2000, tickets: 10 }, premiumReward: { gold: 4000, tickets: 60 } },
        { level: 40, freeReward: { gold: 2500, tickets: 15 }, premiumReward: { gold: 5000, tickets: 80 } },

        // 41-50级
        { level: 45, freeReward: { gold: 3000, tickets: 20 }, premiumReward: { gold: 6000, tickets: 100 } },
        { level: 50, freeReward: { gold: 5000, tickets: 50 }, premiumReward: { gold: 10000, tickets: 200 } }
    ];

    /**
     * 用户赛季数据存储（内存）
     */
    private static userSeasonMap = new Map<string, UserSeasonData>();

    /**
     * 获取当前赛季
     */
    static getCurrentSeason(): SeasonConfig {
        return this.currentSeason;
    }

    /**
     * 获取用户赛季数据
     */
    static getUserSeasonData(userId: string): UserSeasonData {
        let data = this.userSeasonMap.get(userId);

        if (!data) {
            data = {
                userId,
                seasonId: this.currentSeason.seasonId,
                level: 1,
                exp: 0,
                expToNext: this.getExpForLevel(1),
                hasPremiumPass: false,
                claimedFreeRewards: [],
                claimedPremiumRewards: [],
                multiplier: 1.0
            };
            this.userSeasonMap.set(userId, data);
        }

        return data;
    }

    /**
     * 添加经验
     */
    static async addExp(userId: string, expAmount: number): Promise<{
        leveledUp: boolean;
        newLevel?: number;
        rewards?: Array<{ level: number; reward: TaskReward }>;
    }> {
        const data = this.getUserSeasonData(userId);

        if (data.level >= this.currentSeason.maxLevel) {
            return { leveledUp: false };
        }

        data.exp += expAmount;

        const leveledUpRewards: Array<{ level: number; reward: TaskReward }> = [];
        let leveledUp = false;

        // 检查是否升级（可能连升多级）
        while (data.exp >= data.expToNext && data.level < this.currentSeason.maxLevel) {
            data.exp -= data.expToNext;
            data.level++;
            data.expToNext = this.getExpForLevel(data.level);

            leveledUp = true;

            // 更新倍率
            const multiplierUnlock = this.MULTIPLIER_UNLOCKS.find(m => m.level === data.level);
            if (multiplierUnlock) {
                data.multiplier = multiplierUnlock.multiplier;
                console.log(`[SeasonSystem] 用户 ${userId} 解锁倍率：${data.multiplier}x`);
            }

            console.log(`[SeasonSystem] 🎉 用户 ${userId} 升级到 Level ${data.level}！`);
        }

        return {
            leveledUp,
            newLevel: leveledUp ? data.level : undefined
        };
    }

    /**
     * 获取等级所需经验
     */
    private static getExpForLevel(level: number): number {
        if (level < 1) return 0;
        if (level > this.currentSeason.maxLevel) return 999999;

        // 使用预定义曲线
        if (level <= this.EXP_CURVE.length) {
            return this.EXP_CURVE[level - 1];
        }

        // 10级以后使用公式：600 + (level - 10) * 50
        return 600 + (level - 10) * 50;
    }

    /**
     * 购买高级通行证
     */
    static async purchasePremiumPass(userId: string, price: number = 490): Promise<{
        success: boolean;
        error?: string;
    }> {
        const data = this.getUserSeasonData(userId);

        if (data.hasPremiumPass) {
            return { success: false, error: '已拥有高级通行证' };
        }

        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (user.gold < price) {
            return { success: false, error: '金币不足' };
        }

        // 扣除金币
        await UserDB.updateUser(userId, {
            gold: user.gold - price
        });

        // 激活高级通行证
        data.hasPremiumPass = true;

        console.log(`[SeasonSystem] 用户 ${userId} 购买了高级通行证！`);

        return { success: true };
    }

    /**
     * 领取等级奖励
     */
    static async claimLevelReward(
        userId: string,
        level: number,
        type: BattlePassType
    ): Promise<{
        success: boolean;
        reward?: TaskReward;
        error?: string;
    }> {
        const data = this.getUserSeasonData(userId);

        // 检查等级是否达到
        if (data.level < level) {
            return { success: false, error: '等级不足' };
        }

        // 检查是否已领取
        const claimedList = type === BattlePassType.Free
            ? data.claimedFreeRewards
            : data.claimedPremiumRewards;

        if (claimedList.includes(level)) {
            return { success: false, error: '奖励已领取' };
        }

        // 检查高级通行证
        if (type === BattlePassType.Premium && !data.hasPremiumPass) {
            return { success: false, error: '需要购买高级通行证' };
        }

        // 获取奖励配置
        const rewardConfig = this.LEVEL_REWARDS.find(r => r.level === level);
        if (!rewardConfig) {
            return { success: false, error: '该等级没有奖励' };
        }

        const reward = type === BattlePassType.Free
            ? rewardConfig.freeReward
            : rewardConfig.premiumReward;

        if (!reward) {
            return { success: false, error: '该等级没有奖励' };
        }

        // 发放奖励
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        await UserDB.updateUser(userId, {
            gold: user.gold + (reward.gold || 0)
        });

        if (reward.tickets) {
            await UserDB.addTickets(userId, reward.tickets);
        }

        // 记录已领取
        claimedList.push(level);

        console.log(`[SeasonSystem] 用户 ${userId} 领取了 Level ${level} ${type} 奖励`);

        return { success: true, reward };
    }

    /**
     * 获取可领取的奖励列表
     */
    static getClaimableRewards(userId: string): {
        free: number[];
        premium: number[];
    } {
        const data = this.getUserSeasonData(userId);

        const free: number[] = [];
        const premium: number[] = [];

        for (const config of this.LEVEL_REWARDS) {
            if (config.level <= data.level) {
                // 免费奖励
                if (config.freeReward && !data.claimedFreeRewards.includes(config.level)) {
                    free.push(config.level);
                }

                // 高级奖励
                if (data.hasPremiumPass &&
                    config.premiumReward &&
                    !data.claimedPremiumRewards.includes(config.level)) {
                    premium.push(config.level);
                }
            }
        }

        return { free, premium };
    }

    /**
     * 获取赛季统计
     */
    static getSeasonStats(userId: string): {
        level: number;
        exp: number;
        expToNext: number;
        progress: number;
        hasPremiumPass: boolean;
        multiplier: number;
        totalClaimedRewards: number;
        daysRemaining: number;
    } {
        const data = this.getUserSeasonData(userId);
        const now = Date.now();
        const daysRemaining = Math.ceil((this.currentSeason.endTime - now) / (24 * 60 * 60 * 1000));

        return {
            level: data.level,
            exp: data.exp,
            expToNext: data.expToNext,
            progress: (data.exp / data.expToNext) * 100,
            hasPremiumPass: data.hasPremiumPass,
            multiplier: data.multiplier,
            totalClaimedRewards: data.claimedFreeRewards.length + data.claimedPremiumRewards.length,
            daysRemaining: Math.max(0, daysRemaining)
        };
    }

    /**
     * 获取所有奖励列表（供客户端展示）
     */
    static getAllRewards(): LevelReward[] {
        return this.LEVEL_REWARDS;
    }

    /**
     * 获取当前倍率
     */
    static getMultiplier(userId: string): number {
        const data = this.getUserSeasonData(userId);
        return data.multiplier;
    }

    /**
     * 结束赛季（管理员功能）
     */
    static async endSeason(): Promise<void> {
        console.log(`[SeasonSystem] 赛季 ${this.currentSeason.seasonId} 结束！`);

        // 1. 发放赛季结束奖励
        const allUsers = await this.getAllSeasonUsers(this.currentSeason.seasonId);

        for (const userData of allUsers) {
            // 根据等级发放奖励
            const rewards: any = {
                gold: userData.level * 100,  // 每级100金币
                tickets: Math.floor(userData.level / 5),  // 每5级1张彩票
            };

            // 发放高级通行证额外奖励
            if (userData.hasPremiumPass) {
                rewards.gold *= 2;
                rewards.tickets *= 2;
            }

            await MailSystem.sendMail(
                userData.userId,
                MailType.System,
                `赛季${this.currentSeason.seasonNumber}结束奖励`,
                `恭喜完成赛季${this.currentSeason.seasonNumber}！您达到了等级${userData.level}，获得结算奖励。`,
                'SeasonSystem',
                rewards,
                30 * 24 * 60 * 60 * 1000
            );
        }

        // 2. 生成赛季报告（存储到数据库）
        const report = await this.generateSeasonReport(this.currentSeason.seasonId);
        console.log(`[SeasonSystem] 赛季报告已生成:`, report);

        // 3. 重置用户数据（标记为历史数据）
        await this.archiveSeasonData(this.currentSeason.seasonId);

        this.currentSeason.status = SeasonStatus.Ended;
    }

    /**
     * 获取参与赛季的所有用户
     */
    private static async getAllSeasonUsers(seasonId: string): Promise<UserSeasonData[]> {
        // 从内存Map获取
        const users: UserSeasonData[] = [];
        for (const [key, data] of this.userSeasonMap.entries()) {
            if (data.seasonId === seasonId) {
                users.push(data);
            }
        }
        return users;
    }

    /**
     * 生成赛季报告
     */
    private static async generateSeasonReport(seasonId: string) {
        const allUsers = await this.getAllSeasonUsers(seasonId);

        const report = {
            seasonId,
            seasonNumber: this.currentSeason.seasonNumber,
            totalPlayers: allUsers.length,
            averageLevel: allUsers.length > 0
                ? allUsers.reduce((sum, u) => sum + u.level, 0) / allUsers.length
                : 0,
            maxLevelReached: Math.max(...allUsers.map(u => u.level), 0),
            premiumPassPurchases: allUsers.filter(u => u.hasPremiumPass).length,
            topPlayers: allUsers
                .sort((a, b) => b.level - a.level)
                .slice(0, 10)
                .map(u => ({ userId: u.userId, level: u.level })),
            generatedAt: Date.now(),
        };

        // 保存报告到数据库（可选）
        // await MongoDBService.getCollection('season_reports').insertOne(report);

        return report;
    }

    /**
     * 归档赛季数据
     */
    private static async archiveSeasonData(seasonId: string): Promise<void> {
        // 将内存中的数据标记为历史，不删除（允许玩家查看历史战绩）
        // 实际生产环境可以将数据迁移到历史表
        console.log(`[SeasonSystem] 归档赛季数据: ${seasonId}`);

        // 清空内存中的当前赛季数据（下个赛季会重新初始化）
        for (const [key, data] of this.userSeasonMap.entries()) {
            if (data.seasonId === seasonId) {
                // 可以选择删除或保留
                // this.userSeasonMap.delete(key);
            }
        }
    }

    /**
     * 开始新赛季（管理员功能）
     */
    static async startNewSeason(config: Partial<SeasonConfig>): Promise<void> {
        const newSeason: SeasonConfig = {
            seasonId: config.seasonId || `season_${this.currentSeason.seasonNumber + 1}`,
            seasonNumber: this.currentSeason.seasonNumber + 1,
            name: config.name || `赛季 ${this.currentSeason.seasonNumber + 1}`,
            theme: config.theme || 'New Season',
            startTime: config.startTime || Date.now(),
            endTime: config.endTime || Date.now() + 30 * 24 * 60 * 60 * 1000,
            status: SeasonStatus.Active,
            maxLevel: config.maxLevel || 50
        };

        this.currentSeason = newSeason;
        this.userSeasonMap.clear(); // 清空用户数据

        console.log(`[SeasonSystem] 新赛季 ${newSeason.seasonId} 开始！`);
    }
}
