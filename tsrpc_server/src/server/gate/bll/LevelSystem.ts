/**
 * 🎖️ 等级系统
 *
 * 功能：
 * 1. 经验值累计
 * 2. 等级提升
 * 3. 等级奖励（倍率、掉落率、皮肤）
 * 4. 等级排行榜
 * 5. 经验加成（VIP、Buff等）
 *
 * 等级设计：
 * - 1-10级：新手期，快速升级
 * - 11-30级：成长期，正常速度
 * - 31-50级：进阶期，较慢
 * - 51-100级：大师期，很慢
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';
import { ObjectId } from 'mongodb';

/** 等级数据 */
export interface LevelData {
    _id?: ObjectId;
    userId: string;
    level: number;              // 当前等级
    exp: number;                // 当前经验值
    expToNext: number;          // 升到下一级所需经验
    totalExp: number;           // 总经验值
    lastLevelUpTime: number;    // 上次升级时间
    levelUpCount: number;       // 总升级次数
}

/** 等级配置 */
export interface LevelConfig {
    level: number;              // 等级
    requiredExp: number;        // 所需经验
    rewards: LevelReward;       // 等级奖励
}

/** 等级奖励 */
export interface LevelReward {
    gold?: number;              // 金币奖励
    tickets?: number;           // 彩票奖励
    multiplier?: number;        // 奖励倍率加成
    dropRateBonus?: number;     // 掉落率加成（%）
    unlockedSkins?: string[];   // 解锁皮肤
    unlockedItems?: string[];   // 解锁道具
    title?: string;             // 称号
}

/** 经验来源 */
export enum ExpSource {
    Task = 'task',              // 任务
    Achievement = 'achievement', // 成就
    SignIn = 'signin',          // 签到
    Invite = 'invite',          // 邀请
    Purchase = 'purchase',      // 购买
    Activity = 'activity',      // 活动
    Admin = 'admin'             // 管理员发放
}

export class LevelSystem {
    /**
     * 等级配置（1-100级）
     */
    private static readonly LEVEL_CONFIGS: LevelConfig[] = this.generateLevelConfigs();

    /**
     * 添加经验
     */
    static async addExp(userId: string, exp: number, source: ExpSource): Promise<{
        success: boolean;
        leveledUp: boolean;
        oldLevel?: number;
        newLevel?: number;
        rewards?: LevelReward[];
        error?: string;
    }> {
        try {
            if (exp <= 0) {
                return { success: false, leveledUp: false, error: '经验值必须大于0' };
            }

            const collection = MongoDBService.getCollection<LevelData>('level_data');
            let levelData = await collection.findOne({ userId }) as LevelData | null;

            // 初始化等级数据
            if (!levelData) {
                levelData = {
                    userId,
                    level: 1,
                    exp: 0,
                    expToNext: this.LEVEL_CONFIGS[0].requiredExp,
                    totalExp: 0,
                    lastLevelUpTime: Date.now(),
                    levelUpCount: 0
                };
            }

            const oldLevel = levelData.level;
            let currentExp = levelData.exp + exp;
            let currentLevel = levelData.level;
            const leveledUpLevels: number[] = [];
            const rewardsCollected: LevelReward[] = [];

            // 检查是否升级（可能连续升多级）
            while (currentLevel < 100) {
                const config = this.LEVEL_CONFIGS.find(c => c.level === currentLevel);
                if (!config) break;

                if (currentExp >= config.requiredExp) {
                    // 升级
                    currentExp -= config.requiredExp;
                    currentLevel++;
                    leveledUpLevels.push(currentLevel);

                    // 收集奖励
                    const newLevelConfig = this.LEVEL_CONFIGS.find(c => c.level === currentLevel);
                    if (newLevelConfig && newLevelConfig.rewards) {
                        rewardsCollected.push(newLevelConfig.rewards);
                        await this.giveLevelReward(userId, newLevelConfig.rewards);
                    }

                    console.log(`[LevelSystem] User ${userId} leveled up to ${currentLevel}`);
                } else {
                    break;
                }
            }

            // 更新等级数据
            const nextLevelConfig = this.LEVEL_CONFIGS.find(c => c.level === currentLevel);
            const newLevelData: LevelData = {
                userId,
                level: currentLevel,
                exp: currentExp,
                expToNext: nextLevelConfig?.requiredExp || 0,
                totalExp: levelData.totalExp + exp,
                lastLevelUpTime: leveledUpLevels.length > 0 ? Date.now() : levelData.lastLevelUpTime,
                levelUpCount: levelData.levelUpCount + leveledUpLevels.length
            };

            await collection.updateOne(
                { userId },
                { $set: newLevelData },
                { upsert: true }
            );

            // 如果升级了，更新排行榜
            if (leveledUpLevels.length > 0) {
                await this.updateLevelLeaderboard(userId, currentLevel);
            }

            // 缓存等级数据
            await DragonflyDBService.set(
                `level:${userId}`,
                JSON.stringify(newLevelData),
                3600  // 1小时
            );

            console.log(`[LevelSystem] User ${userId} gained ${exp} exp from ${source}, level: ${oldLevel} -> ${currentLevel}`);

            return {
                success: true,
                leveledUp: leveledUpLevels.length > 0,
                oldLevel,
                newLevel: currentLevel,
                rewards: rewardsCollected
            };
        } catch (error) {
            console.error('[LevelSystem] Add exp error:', error);
            return {
                success: false,
                leveledUp: false,
                error: '添加经验失败'
            };
        }
    }

    /**
     * 获取等级信息
     */
    static async getLevelInfo(userId: string): Promise<LevelData> {
        try {
            // 先尝试从缓存获取
            const cached = await DragonflyDBService.get(`level:${userId}`);
            if (cached) {
                return JSON.parse(cached);
            }

            const collection = MongoDBService.getCollection<LevelData>('level_data');
            let levelData = await collection.findOne({ userId }) as LevelData | null;

            if (!levelData) {
                // 初始化
                levelData = {
                    userId,
                    level: 1,
                    exp: 0,
                    expToNext: this.LEVEL_CONFIGS[0].requiredExp,
                    totalExp: 0,
                    lastLevelUpTime: Date.now(),
                    levelUpCount: 0
                };
                await collection.insertOne(levelData);
            }

            // 缓存
            await DragonflyDBService.set(
                `level:${userId}`,
                JSON.stringify(levelData),
                3600
            );

            return levelData;
        } catch (error) {
            console.error('[LevelSystem] Get level info error:', error);
            // 返回默认值
            return {
                userId,
                level: 1,
                exp: 0,
                expToNext: 100,
                totalExp: 0,
                lastLevelUpTime: Date.now(),
                levelUpCount: 0
            };
        }
    }

    /**
     * 兼容旧接口命名
     */
    static async getUserLevel(userId: string): Promise<LevelData> {
        return this.getLevelInfo(userId);
    }

    /**
     * 获取等级配置
     */
    static getLevelConfig(level: number): LevelConfig | null {
        return this.LEVEL_CONFIGS.find(c => c.level === level) || null;
    }

    /**
     * 获取所有等级配置
     */
    static getAllLevelConfigs(): LevelConfig[] {
        return this.LEVEL_CONFIGS;
    }

    /**
     * 获取等级奖励（倍率、掉落率等）
     */
    static async getLevelBonuses(userId: string): Promise<{
        multiplier: number;
        dropRateBonus: number;
        unlockedSkins: string[];
        title?: string;
    }> {
        try {
            const levelData = await this.getLevelInfo(userId);
            const config = this.getLevelConfig(levelData.level);

            if (!config || !config.rewards) {
                return {
                    multiplier: 1.0,
                    dropRateBonus: 0,
                    unlockedSkins: []
                };
            }

            return {
                multiplier: config.rewards.multiplier || 1.0,
                dropRateBonus: config.rewards.dropRateBonus || 0,
                unlockedSkins: config.rewards.unlockedSkins || [],
                title: config.rewards.title
            };
        } catch (error) {
            console.error('[LevelSystem] Get level bonuses error:', error);
            return {
                multiplier: 1.0,
                dropRateBonus: 0,
                unlockedSkins: []
            };
        }
    }

    /**
     * 获取等级排行榜
     */
    static async getLevelLeaderboard(limit: number = 100): Promise<Array<{
        userId: string;
        level: number;
        totalExp: number;
        rank: number;
    }>> {
        try {
            const collection = MongoDBService.getCollection<LevelData>('level_data');
            const leaderboard = await collection
                .find({})
                .sort({ level: -1, totalExp: -1 })
                .limit(limit)
                .toArray();

            return leaderboard.map((data, index) => ({
                userId: data.userId,
                level: data.level,
                totalExp: data.totalExp,
                rank: index + 1
            }));
        } catch (error) {
            console.error('[LevelSystem] Get level leaderboard error:', error);
            return [];
        }
    }

    /**
     * 发放等级奖励
     */
    private static async giveLevelReward(userId: string, reward: LevelReward): Promise<void> {
        // 发放金币
        if (reward.gold && reward.gold > 0) {
            await UserDB.addGold(userId, reward.gold);
        }

        // 发放彩票
        if (reward.tickets && reward.tickets > 0) {
            await UserDB.addTickets(userId, reward.tickets);
        }

        // 解锁皮肤
        if (reward.unlockedSkins && reward.unlockedSkins.length > 0) {
            // TODO: 通过SkinSystem解锁皮肤
            // for (const skinId of reward.unlockedSkins) {
            //     await SkinSystem.unlockSkin(userId, skinId);
            // }
        }

        // 解锁道具
        if (reward.unlockedItems && reward.unlockedItems.length > 0) {
            // TODO: 通过ItemSystem发放道具
            // for (const itemId of reward.unlockedItems) {
            //     await ItemSystem.giveItem(userId, itemId, 1);
            // }
        }

        // 授予称号
        if (reward.title) {
            // TODO: 保存用户称号
            // await UserDB.grantTitle(userId, reward.title);
        }
    }

    /**
     * 更新等级排行榜（DragonflyDB）
     */
    private static async updateLevelLeaderboard(userId: string, level: number): Promise<void> {
        try {
            const levelData = await this.getLevelInfo(userId);
            const score = level * 1000000 + levelData.totalExp;  // 等级为主，总经验为辅

            await DragonflyDBService.zadd('leaderboard:level', score, userId);
        } catch (error) {
            console.error('[LevelSystem] Update level leaderboard error:', error);
        }
    }

    /**
     * 生成等级配置（1-100级）
     */
    private static generateLevelConfigs(): LevelConfig[] {
        const configs: LevelConfig[] = [];

        for (let level = 1; level <= 100; level++) {
            let requiredExp: number;
            let rewards: LevelReward = {};

            // 根据等级段设置经验需求
            if (level <= 10) {
                // 1-10级：新手期，快速升级
                requiredExp = 100 + (level - 1) * 50;
            } else if (level <= 30) {
                // 11-30级：成长期
                requiredExp = 500 + (level - 10) * 100;
            } else if (level <= 50) {
                // 31-50级：进阶期
                requiredExp = 2500 + (level - 30) * 200;
            } else {
                // 51-100级：大师期
                requiredExp = 6500 + (level - 50) * 300;
            }

            // 设置奖励
            if (level % 10 === 0) {
                // 每10级：大奖励
                rewards = {
                    gold: level * 100,
                    tickets: level * 2,
                    multiplier: 1.0 + level * 0.02,
                    dropRateBonus: level * 0.5,
                    unlockedSkins: [`skin_level_${level}`],
                    title: this.getLevelTitle(level)
                };
            } else if (level % 5 === 0) {
                // 每5级：中奖励
                rewards = {
                    gold: level * 50,
                    tickets: level,
                    multiplier: 1.0 + level * 0.02,
                    dropRateBonus: level * 0.5
                };
            } else {
                // 普通等级：小奖励
                rewards = {
                    gold: level * 20,
                    multiplier: 1.0 + level * 0.02,
                    dropRateBonus: level * 0.5
                };
            }

            configs.push({
                level,
                requiredExp,
                rewards
            });
        }

        return configs;
    }

    /**
     * 获取等级称号
     */
    private static getLevelTitle(level: number): string {
        if (level >= 100) return '传说大师';
        if (level >= 90) return '至尊王者';
        if (level >= 80) return '荣耀王者';
        if (level >= 70) return '最强王者';
        if (level >= 60) return '超凡大师';
        if (level >= 50) return '璀璨钻石';
        if (level >= 40) return '华贵铂金';
        if (level >= 30) return '荣耀黄金';
        if (level >= 20) return '不屈白银';
        if (level >= 10) return '英勇青铜';
        return '新手玩家';
    }
}
