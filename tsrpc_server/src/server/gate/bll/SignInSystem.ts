/**
 * 📅 签到系统
 *
 * 功能：
 * 1. 每日签到
 * 2. 连续签到奖励
 * 3. 累计签到统计
 * 4. 第7天奖励翻倍
 * 5. 第14/30天限定奖励
 * 6. 补签功能
 *
 * 奖励机制：
 * - 每日基础奖励：金币 + 彩票
 * - 连续7天：奖励x2
 * - 累计14天：限定皮肤
 * - 累计30天：特殊道具
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';

/** 签到记录 */
export interface SignInRecord {
    userId: string;
    signInDate: number;         // 签到日期（YYYYMMDD格式）
    consecutiveDays: number;    // 当前连续天数
    totalDays: number;          // 总签到天数
    lastSignInTime: number;     // 上次签到时间戳
    monthlySignIns: number;     // 本月签到天数
    rewards: SignInReward[];    // 已领取奖励记录
}

/** 签到奖励 */
export interface SignInReward {
    day: number;
    gold: number;
    tickets: number;
    items?: string[];
    skinId?: string;
    claimed: boolean;
    claimedAt?: number;
}

/** 签到配置 */
export interface SignInConfig {
    day: number;                // 第几天
    gold: number;               // 金币奖励
    tickets: number;            // 彩票奖励
    items?: string[];           // 道具奖励
    skinId?: string;            // 皮肤奖励
    multiplier: number;         // 奖励倍数（第7天等）
    special: boolean;           // 是否特殊奖励
}

export class SignInSystem {
    /**
     * 签到配置（30天）
     */
    private static readonly SIGN_IN_CONFIGS: SignInConfig[] = [
        // 第1-6天：基础奖励递增
        { day: 1, gold: 100, tickets: 1, multiplier: 1, special: false },
        { day: 2, gold: 120, tickets: 1, multiplier: 1, special: false },
        { day: 3, gold: 150, tickets: 2, multiplier: 1, special: false },
        { day: 4, gold: 180, tickets: 2, multiplier: 1, special: false },
        { day: 5, gold: 200, tickets: 3, multiplier: 1, special: false },
        { day: 6, gold: 250, tickets: 3, multiplier: 1, special: false },

        // 第7天：翻倍奖励
        { day: 7, gold: 300, tickets: 5, multiplier: 2, special: true, items: ['lucky_charm'] },

        // 第8-13天：继续递增
        { day: 8, gold: 150, tickets: 2, multiplier: 1, special: false },
        { day: 9, gold: 180, tickets: 2, multiplier: 1, special: false },
        { day: 10, gold: 200, tickets: 3, multiplier: 1, special: false },
        { day: 11, gold: 220, tickets: 3, multiplier: 1, special: false },
        { day: 12, gold: 250, tickets: 4, multiplier: 1, special: false },
        { day: 13, gold: 280, tickets: 4, multiplier: 1, special: false },

        // 第14天：限定皮肤
        { day: 14, gold: 500, tickets: 10, multiplier: 2, special: true, skinId: 'skin_signin_14' },

        // 第15-20天
        { day: 15, gold: 200, tickets: 3, multiplier: 1, special: false },
        { day: 16, gold: 220, tickets: 3, multiplier: 1, special: false },
        { day: 17, gold: 250, tickets: 4, multiplier: 1, special: false },
        { day: 18, gold: 280, tickets: 4, multiplier: 1, special: false },
        { day: 19, gold: 300, tickets: 5, multiplier: 1, special: false },
        { day: 20, gold: 350, tickets: 5, multiplier: 1, special: false },

        // 第21天：翻倍奖励
        { day: 21, gold: 400, tickets: 8, multiplier: 2, special: true, items: ['multiplier_x3'] },

        // 第22-29天
        { day: 22, gold: 250, tickets: 4, multiplier: 1, special: false },
        { day: 23, gold: 280, tickets: 4, multiplier: 1, special: false },
        { day: 24, gold: 300, tickets: 5, multiplier: 1, special: false },
        { day: 25, gold: 320, tickets: 5, multiplier: 1, special: false },
        { day: 26, gold: 350, tickets: 6, multiplier: 1, special: false },
        { day: 27, gold: 380, tickets: 6, multiplier: 1, special: false },
        { day: 28, gold: 400, tickets: 7, multiplier: 1, special: false },
        { day: 29, gold: 450, tickets: 8, multiplier: 1, special: false },

        // 第30天：超级大奖
        { day: 30, gold: 1000, tickets: 20, multiplier: 3, special: true,
          skinId: 'skin_signin_30', items: ['super_pusher', 'multiplier_x3'] }
    ];

    /**
     * 每日签到
     */
    static async signIn(userId: string): Promise<{
        success: boolean;
        error?: string;
        reward?: SignInReward;
        consecutiveDays?: number;
        totalDays?: number;
    }> {
        try {
            const collection = MongoDBService.getCollection<SignInRecord>('sign_in_records');
            const now = Date.now();
            const today = this.getTodayDateNumber();
            const yesterday = this.getYesterdayDateNumber();

            // 获取用户签到记录
            let record = await collection.findOne({ userId });

            // 检查是否已签到
            if (record && record.signInDate === today) {
                return {
                    success: false,
                    error: '今天已经签到过了'
                };
            }

            // 计算连续天数
            let consecutiveDays = 1;
            let totalDays = 1;
            let monthlySignIns = 1;

            if (record) {
                totalDays = record.totalDays + 1;

                // 检查是否连续
                if (record.signInDate === yesterday) {
                    consecutiveDays = record.consecutiveDays + 1;
                } else {
                    consecutiveDays = 1;  // 断签，重置连续天数
                }

                // 检查是否同月
                const lastMonth = Math.floor(record.signInDate / 100);
                const currentMonth = Math.floor(today / 100);
                if (lastMonth === currentMonth) {
                    monthlySignIns = record.monthlySignIns + 1;
                } else {
                    monthlySignIns = 1;  // 新月份，重置
                }
            }

            // 获取当天应该发放的奖励（按30天循环）
            const dayInCycle = ((consecutiveDays - 1) % 30) + 1;
            const config = this.SIGN_IN_CONFIGS.find(c => c.day === dayInCycle) || this.SIGN_IN_CONFIGS[0];

            // 计算实际奖励
            const reward: SignInReward = {
                day: consecutiveDays,
                gold: config.gold * config.multiplier,
                tickets: config.tickets * config.multiplier,
                items: config.items,
                skinId: config.skinId,
                claimed: true,
                claimedAt: now
            };

            // 发放奖励
            await this.giveSignInReward(userId, reward);

            // 更新签到记录
            const newRecord: SignInRecord = {
                userId,
                signInDate: today,
                consecutiveDays,
                totalDays,
                lastSignInTime: now,
                monthlySignIns,
                rewards: record ? [...record.rewards, reward] : [reward]
            };

            await collection.updateOne(
                { userId },
                { $set: newRecord },
                { upsert: true }
            );

            // 缓存签到状态
            await DragonflyDBService.set(
                `signin:${userId}:${today}`,
                '1',
                86400  // 24小时过期
            );

            console.log(`[SignInSystem] User ${userId} signed in, consecutive: ${consecutiveDays}, total: ${totalDays}`);

            return {
                success: true,
                reward,
                consecutiveDays,
                totalDays
            };
        } catch (error) {
            console.error('[SignInSystem] Sign in error:', error);
            return {
                success: false,
                error: '签到失败'
            };
        }
    }

    /**
     * 补签（使用道具或付费）
     */
    static async makeUpSignIn(userId: string, targetDate: number, useItem: boolean = false): Promise<{
        success: boolean;
        error?: string;
        cost?: number;
    }> {
        try {
            // 检查目标日期有效性
            const today = this.getTodayDateNumber();
            if (targetDate >= today) {
                return {
                    success: false,
                    error: '不能补签今天或未来的日期'
                };
            }

            const collection = MongoDBService.getCollection<SignInRecord>('sign_in_records');
            const record = await collection.findOne({ userId });

            if (!record) {
                return {
                    success: false,
                    error: '请先完成首次签到'
                };
            }

            // 检查是否已经签到过该日期
            const alreadySigned = record.rewards.some(r => {
                const rewardDate = this.getDateFromTimestamp(r.claimedAt || 0);
                return rewardDate === targetDate;
            });

            if (alreadySigned) {
                return {
                    success: false,
                    error: '该日期已经签到过了'
                };
            }

            // 计算补签成本
            const daysDiff = Math.floor((today - targetDate) / 10000) * 365; // 简化计算
            const cost = Math.min(50 + daysDiff * 10, 200);  // 最高200金币

            // 扣除金币或道具
            if (useItem) {
                // TODO: 检查并使用补签卡道具
                // const hasItem = await ItemSystem.hasItem(userId, 'makeup_card');
                // if (!hasItem) return { success: false, error: '没有补签卡' };
                // await ItemSystem.consumeItem(userId, 'makeup_card', 1);
            } else {
                const user = await UserDB.getUserById(userId);
                if (!user || user.gold < cost) {
                    return {
                        success: false,
                        error: '金币不足',
                        cost
                    };
                }
                await UserDB.consumeGold(userId, cost);
            }

            // 创建补签奖励（基础奖励）
            const reward: SignInReward = {
                day: record.consecutiveDays + 1,
                gold: 100,
                tickets: 1,
                claimed: true,
                claimedAt: this.getTimestampFromDate(targetDate)
            };

            // 发放奖励
            await this.giveSignInReward(userId, reward);

            // 更新记录
            await collection.updateOne(
                { userId },
                {
                    $push: { rewards: reward },
                    $inc: { totalDays: 1 }
                }
            );

            console.log(`[SignInSystem] User ${userId} made up sign in for ${targetDate}`);

            return {
                success: true,
                cost: useItem ? 0 : cost
            };
        } catch (error) {
            console.error('[SignInSystem] Make up sign in error:', error);
            return {
                success: false,
                error: '补签失败'
            };
        }
    }

    /**
     * 获取签到信息
     */
    static async getSignInInfo(userId: string): Promise<{
        record: SignInRecord | null;
        todaySigned: boolean;
        canSignIn: boolean;
        nextReward: SignInConfig;
        monthlyCalendar: Array<{ date: number; signed: boolean }>;
    }> {
        try {
            const collection = MongoDBService.getCollection<SignInRecord>('sign_in_records');
            const record = await collection.findOne({ userId });

            const today = this.getTodayDateNumber();
            const todaySigned = record?.signInDate === today;

            // 获取下一个奖励配置
            const nextDay = record ? ((record.consecutiveDays % 30) + 1) : 1;
            const nextReward = this.SIGN_IN_CONFIGS.find(c => c.day === nextDay) || this.SIGN_IN_CONFIGS[0];

            // 生成本月日历
            const monthlyCalendar = this.generateMonthlyCalendar(record);

            return {
                record,
                todaySigned,
                canSignIn: !todaySigned,
                nextReward,
                monthlyCalendar
            };
        } catch (error) {
            console.error('[SignInSystem] Get sign in info error:', error);
            return {
                record: null,
                todaySigned: false,
                canSignIn: true,
                nextReward: this.SIGN_IN_CONFIGS[0],
                monthlyCalendar: []
            };
        }
    }

    /**
     * 获取签到配置列表
     */
    static getSignInConfigs(): SignInConfig[] {
        return this.SIGN_IN_CONFIGS;
    }

    /**
     * 发放签到奖励
     */
    private static async giveSignInReward(userId: string, reward: SignInReward): Promise<void> {
        // 发放金币
        if (reward.gold > 0) {
            await UserDB.addGold(userId, reward.gold);
        }

        // 发放彩票
        if (reward.tickets > 0) {
            await UserDB.addTickets(userId, reward.tickets);
        }

        // 发放道具
        if (reward.items && reward.items.length > 0) {
            const { ItemSystem } = await import('./ItemSystem');
            for (const itemId of reward.items) {
                await ItemSystem.addItem(userId, itemId, 1);
            }
        }

        // 发放皮肤
        if (reward.skinId) {
            const { SkinSystem } = await import('./SkinSystem');
            await SkinSystem.unlockSkin(userId, reward.skinId);
        }
    }

    /**
     * 生成本月签到日历
     */
    private static generateMonthlyCalendar(record: SignInRecord | null): Array<{ date: number; signed: boolean }> {
        const calendar: Array<{ date: number; signed: boolean }> = [];
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const dateNum = year * 10000 + month * 100 + day;
            const signed = record?.rewards.some(r => {
                const rewardDate = this.getDateFromTimestamp(r.claimedAt || 0);
                return rewardDate === dateNum;
            }) || false;

            calendar.push({ date: dateNum, signed });
        }

        return calendar;
    }

    /**
     * 获取今天的日期数字 (YYYYMMDD)
     */
    private static getTodayDateNumber(): number {
        const now = new Date();
        return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    }

    /**
     * 获取昨天的日期数字
     */
    private static getYesterdayDateNumber(): number {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.getFullYear() * 10000 + (yesterday.getMonth() + 1) * 100 + yesterday.getDate();
    }

    /**
     * 从时间戳获取日期数字
     */
    private static getDateFromTimestamp(timestamp: number): number {
        const date = new Date(timestamp);
        return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    }

    /**
     * 从日期数字获取时间戳
     */
    private static getTimestampFromDate(dateNum: number): number {
        const year = Math.floor(dateNum / 10000);
        const month = Math.floor((dateNum % 10000) / 100);
        const day = dateNum % 100;
        return new Date(year, month - 1, day).getTime();
    }
}
