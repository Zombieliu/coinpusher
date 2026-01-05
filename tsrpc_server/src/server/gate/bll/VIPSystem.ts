/**
 * 👑 VIP系统
 *
 * 功能：
 * 1. VIP等级（1-10级）
 * 2. VIP特权（金币加成、经验加成、掉落加成）
 * 3. VIP订阅/续费
 * 4. 累计充值升级VIP
 * 5. VIP专属道具/皮肤
 * 6. VIP到期提醒
 *
 * VIP设计：
 * - VIP1-3：小额充值用户
 * - VIP4-6：中等充值用户
 * - VIP7-9：大R用户
 * - VIP10：顶级VIP
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';
import { ObjectId } from 'mongodb';

/** VIP等级 */
export type VIPLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** VIP数据 */
export interface VIPData {
    _id?: ObjectId;
    userId: string;
    vipLevel: VIPLevel;         // VIP等级
    vipExpireAt: number;        // VIP过期时间（0表示永久）
    totalRecharge: number;      // 累计充值（用于升级VIP等级）
    lastRechargeTime: number;   // 最后充值时间
    privileges: VIPPrivileges;  // 特权
    purchaseHistory: VIPPurchase[];  // 购买历史
}

/** VIP特权 */
export interface VIPPrivileges {
    dailyGoldBonus: number;     // 每日金币奖励
    dailyTicketBonus: number;   // 每日彩票奖励
    expMultiplier: number;      // 经验倍率
    goldMultiplier: number;     // 金币获取倍率
    dropRateBonus: number;      // 掉落率加成（%）
    shopDiscount: number;       // 商城折扣（%）
    signInBonus: number;        // 签到奖励加成（%）
    exclusiveSkins: string[];   // 专属皮肤
    exclusiveItems: string[];   // 专属道具
    dailyFreeDraws: number;     // 每日免费抽奖次数
}

/** VIP购买记录 */
export interface VIPPurchase {
    orderId: string;
    vipLevel: VIPLevel;
    duration: number;           // 天数
    price: number;
    purchasedAt: number;
}

/** VIP配置 */
export interface VIPConfig {
    level: VIPLevel;
    requiredRecharge: number;   // 需要累计充值金额
    monthlyPrice: number;       // 月费价格
    privileges: VIPPrivileges;
    name: string;               // VIP名称
    icon: string;               // 图标
}

export class VIPSystem {
    /**
     * VIP配置（0-10级）
     */
    private static readonly VIP_CONFIGS: VIPConfig[] = [
        {
            level: 0,
            requiredRecharge: 0,
            monthlyPrice: 0,
            name: '普通用户',
            icon: 'vip_0',
            privileges: {
                dailyGoldBonus: 0,
                dailyTicketBonus: 0,
                expMultiplier: 1.0,
                goldMultiplier: 1.0,
                dropRateBonus: 0,
                shopDiscount: 0,
                signInBonus: 0,
                exclusiveSkins: [],
                exclusiveItems: [],
                dailyFreeDraws: 0
            }
        },
        {
            level: 1,
            requiredRecharge: 10,    // 累计充值$10
            monthlyPrice: 2.99,
            name: 'VIP青铜',
            icon: 'vip_1',
            privileges: {
                dailyGoldBonus: 100,
                dailyTicketBonus: 2,
                expMultiplier: 1.1,
                goldMultiplier: 1.1,
                dropRateBonus: 5,
                shopDiscount: 5,
                signInBonus: 10,
                exclusiveSkins: ['skin_vip1'],
                exclusiveItems: [],
                dailyFreeDraws: 1
            }
        },
        {
            level: 2,
            requiredRecharge: 30,
            monthlyPrice: 4.99,
            name: 'VIP白银',
            icon: 'vip_2',
            privileges: {
                dailyGoldBonus: 200,
                dailyTicketBonus: 4,
                expMultiplier: 1.15,
                goldMultiplier: 1.15,
                dropRateBonus: 8,
                shopDiscount: 8,
                signInBonus: 15,
                exclusiveSkins: ['skin_vip1', 'skin_vip2'],
                exclusiveItems: ['lucky_charm'],
                dailyFreeDraws: 2
            }
        },
        {
            level: 3,
            requiredRecharge: 50,
            monthlyPrice: 6.99,
            name: 'VIP黄金',
            icon: 'vip_3',
            privileges: {
                dailyGoldBonus: 300,
                dailyTicketBonus: 6,
                expMultiplier: 1.2,
                goldMultiplier: 1.2,
                dropRateBonus: 10,
                shopDiscount: 10,
                signInBonus: 20,
                exclusiveSkins: ['skin_vip1', 'skin_vip2', 'skin_vip3'],
                exclusiveItems: ['lucky_charm', 'multiplier_x2'],
                dailyFreeDraws: 3
            }
        },
        {
            level: 4,
            requiredRecharge: 100,
            monthlyPrice: 9.99,
            name: 'VIP铂金',
            icon: 'vip_4',
            privileges: {
                dailyGoldBonus: 500,
                dailyTicketBonus: 10,
                expMultiplier: 1.3,
                goldMultiplier: 1.3,
                dropRateBonus: 15,
                shopDiscount: 15,
                signInBonus: 30,
                exclusiveSkins: ['skin_vip1', 'skin_vip2', 'skin_vip3', 'skin_vip4'],
                exclusiveItems: ['lucky_charm', 'multiplier_x2', 'magnet'],
                dailyFreeDraws: 4
            }
        },
        {
            level: 5,
            requiredRecharge: 200,
            monthlyPrice: 14.99,
            name: 'VIP钻石',
            icon: 'vip_5',
            privileges: {
                dailyGoldBonus: 800,
                dailyTicketBonus: 15,
                expMultiplier: 1.4,
                goldMultiplier: 1.4,
                dropRateBonus: 20,
                shopDiscount: 20,
                signInBonus: 40,
                exclusiveSkins: ['skin_vip1', 'skin_vip2', 'skin_vip3', 'skin_vip4', 'skin_vip5'],
                exclusiveItems: ['lucky_charm', 'multiplier_x2', 'magnet', 'multiplier_x3'],
                dailyFreeDraws: 5
            }
        },
        {
            level: 6,
            requiredRecharge: 500,
            monthlyPrice: 19.99,
            name: 'VIP大师',
            icon: 'vip_6',
            privileges: {
                dailyGoldBonus: 1200,
                dailyTicketBonus: 20,
                expMultiplier: 1.5,
                goldMultiplier: 1.5,
                dropRateBonus: 25,
                shopDiscount: 25,
                signInBonus: 50,
                exclusiveSkins: ['skin_vip1', 'skin_vip2', 'skin_vip3', 'skin_vip4', 'skin_vip5', 'skin_vip6'],
                exclusiveItems: ['lucky_charm', 'multiplier_x2', 'magnet', 'multiplier_x3', 'super_pusher'],
                dailyFreeDraws: 6
            }
        },
        {
            level: 7,
            requiredRecharge: 1000,
            monthlyPrice: 29.99,
            name: 'VIP王者',
            icon: 'vip_7',
            privileges: {
                dailyGoldBonus: 2000,
                dailyTicketBonus: 30,
                expMultiplier: 1.6,
                goldMultiplier: 1.6,
                dropRateBonus: 30,
                shopDiscount: 30,
                signInBonus: 60,
                exclusiveSkins: ['skin_vip1', 'skin_vip2', 'skin_vip3', 'skin_vip4', 'skin_vip5', 'skin_vip6', 'skin_vip7'],
                exclusiveItems: ['lucky_charm', 'multiplier_x2', 'magnet', 'multiplier_x3', 'super_pusher', 'hammer'],
                dailyFreeDraws: 8
            }
        },
        {
            level: 8,
            requiredRecharge: 2000,
            monthlyPrice: 49.99,
            name: 'VIP荣耀',
            icon: 'vip_8',
            privileges: {
                dailyGoldBonus: 3000,
                dailyTicketBonus: 50,
                expMultiplier: 1.8,
                goldMultiplier: 1.8,
                dropRateBonus: 40,
                shopDiscount: 35,
                signInBonus: 80,
                exclusiveSkins: ['skin_vip1', 'skin_vip2', 'skin_vip3', 'skin_vip4', 'skin_vip5', 'skin_vip6', 'skin_vip7', 'skin_vip8'],
                exclusiveItems: ['lucky_charm', 'multiplier_x2', 'magnet', 'multiplier_x3', 'super_pusher', 'hammer'],
                dailyFreeDraws: 10
            }
        },
        {
            level: 9,
            requiredRecharge: 5000,
            monthlyPrice: 99.99,
            name: 'VIP传说',
            icon: 'vip_9',
            privileges: {
                dailyGoldBonus: 5000,
                dailyTicketBonus: 80,
                expMultiplier: 2.0,
                goldMultiplier: 2.0,
                dropRateBonus: 50,
                shopDiscount: 40,
                signInBonus: 100,
                exclusiveSkins: ['skin_vip1', 'skin_vip2', 'skin_vip3', 'skin_vip4', 'skin_vip5', 'skin_vip6', 'skin_vip7', 'skin_vip8', 'skin_vip9'],
                exclusiveItems: ['lucky_charm', 'multiplier_x2', 'magnet', 'multiplier_x3', 'super_pusher', 'hammer'],
                dailyFreeDraws: 15
            }
        },
        {
            level: 10,
            requiredRecharge: 10000,
            monthlyPrice: 199.99,
            name: 'VIP至尊',
            icon: 'vip_10',
            privileges: {
                dailyGoldBonus: 10000,
                dailyTicketBonus: 100,
                expMultiplier: 2.5,
                goldMultiplier: 2.5,
                dropRateBonus: 100,
                shopDiscount: 50,
                signInBonus: 150,
                exclusiveSkins: ['skin_vip1', 'skin_vip2', 'skin_vip3', 'skin_vip4', 'skin_vip5', 'skin_vip6', 'skin_vip7', 'skin_vip8', 'skin_vip9', 'skin_vip10'],
                exclusiveItems: ['lucky_charm', 'multiplier_x2', 'magnet', 'multiplier_x3', 'super_pusher', 'hammer'],
                dailyFreeDraws: 20
            }
        }
    ];

    /**
     * 获取VIP信息
     */
    static async getVIPInfo(userId: string): Promise<VIPData> {
        try {
            const collection = MongoDBService.getCollection<VIPData>('vip_data');
            let vipData = await collection.findOne({ userId }) as VIPData | null;

            if (!vipData) {
                // 初始化
                const config = this.VIP_CONFIGS[0];
                vipData = {
                    userId,
                    vipLevel: 0,
                    vipExpireAt: 0,
                    totalRecharge: 0,
                    lastRechargeTime: 0,
                    privileges: config.privileges,
                    purchaseHistory: []
                };
                await collection.insertOne(vipData);
            }

            // 检查是否过期
            if (vipData.vipExpireAt > 0 && vipData.vipExpireAt < Date.now()) {
                // VIP已过期，降级到累计充值对应的等级
                const newLevel = this.calculateVIPLevelByRecharge(vipData.totalRecharge);
                if (newLevel < vipData.vipLevel) {
                    vipData.vipLevel = newLevel;
                    vipData.privileges = this.VIP_CONFIGS[newLevel].privileges;
                    await collection.updateOne(
                        { userId },
                        { $set: { vipLevel: newLevel, privileges: vipData.privileges } }
                    );
                }
            }

            return vipData;
        } catch (error) {
            console.error('[VIPSystem] Get VIP info error:', error);
            return {
                userId,
                vipLevel: 0,
                vipExpireAt: 0,
                totalRecharge: 0,
                lastRechargeTime: 0,
                privileges: this.VIP_CONFIGS[0].privileges,
                purchaseHistory: []
            };
        }
    }

    /**
     * 兼容旧接口命名
     */
    static async getUserVIP(userId: string): Promise<VIPData> {
        return this.getVIPInfo(userId);
    }

    /**
     * 购买VIP
     */
    static async purchaseVIP(userId: string, vipLevel: VIPLevel, duration: number = 30): Promise<{
        success: boolean;
        orderId?: string;
        error?: string;
    }> {
        try {
            if (vipLevel < 1 || vipLevel > 10) {
                return { success: false, error: 'VIP等级无效' };
            }

            const config = this.VIP_CONFIGS[vipLevel];
            const price = (config.monthlyPrice * duration) / 30;  // 按天计算价格

            // 这里应该通过PaymentSystem创建订单
            // const orderResult = await PaymentSystem.createOrder(userId, `vip_${vipLevel}_${duration}d`, ...);

            const orderId = `vip_order_${userId}_${Date.now()}`;

            // 暂时直接激活VIP（实际应该在支付回调中激活）
            await this.activateVIP(userId, vipLevel, duration);

            console.log(`[VIPSystem] User ${userId} purchased VIP${vipLevel} for ${duration} days`);

            return {
                success: true,
                orderId
            };
        } catch (error) {
            console.error('[VIPSystem] Purchase VIP error:', error);
            return {
                success: false,
                error: '购买VIP失败'
            };
        }
    }

    /**
     * 激活VIP（支付成功后调用）
     */
    static async activateVIP(userId: string, vipLevel: VIPLevel, duration: number): Promise<void> {
        try {
            const collection = MongoDBService.getCollection<VIPData>('vip_data');
            const vipData = await this.getVIPInfo(userId);
            const now = Date.now();

            // 计算新的过期时间
            let newExpireAt: number;
            if (vipData.vipExpireAt > now) {
                // 续费：在当前过期时间基础上延长
                newExpireAt = vipData.vipExpireAt + duration * 24 * 60 * 60 * 1000;
            } else {
                // 新购买：从现在开始计算
                newExpireAt = now + duration * 24 * 60 * 60 * 1000;
            }

            const config = this.VIP_CONFIGS[vipLevel];
            const purchase: VIPPurchase = {
                orderId: `vip_${userId}_${now}`,
                vipLevel,
                duration,
                price: (config.monthlyPrice * duration) / 30,
                purchasedAt: now
            };

            await collection.updateOne(
                { userId },
                {
                    $set: {
                        vipLevel: Math.max(vipData.vipLevel, vipLevel) as VIPLevel,
                        vipExpireAt: newExpireAt,
                        privileges: config.privileges
                    },
                    $push: { purchaseHistory: purchase }
                },
                { upsert: true }
            );

            // 清除缓存
            await DragonflyDBService.del(`vip:${userId}`);

            // 发放VIP专属道具和皮肤
            if (config.privileges.exclusiveItems && config.privileges.exclusiveItems.length > 0) {
                const { ItemSystem } = await import('./ItemSystem');
                for (const itemId of config.privileges.exclusiveItems) {
                    await ItemSystem.addItem(userId, itemId, 1);
                }
            }
            if (config.privileges.exclusiveSkins && config.privileges.exclusiveSkins.length > 0) {
                const { SkinSystem } = await import('./SkinSystem');
                for (const skinId of config.privileges.exclusiveSkins) {
                    await SkinSystem.unlockSkin(userId, skinId);
                }
            }

            console.log(`[VIPSystem] User ${userId} VIP activated, level: ${vipLevel}, duration: ${duration} days`);
        } catch (error) {
            console.error('[VIPSystem] Activate VIP error:', error);
        }
    }

    /**
     * 回退 VIP 时长（尽力而为，最低回退到当前时间）
     */
    static async revokeVIP(userId: string, durationDays: number): Promise<void> {
        try {
            const collection = MongoDBService.getCollection<VIPData>('vip_data');
            const vipData = await this.getVIPInfo(userId);
            if (!vipData.vipExpireAt || vipData.vipExpireAt <= 0) return;

            const now = Date.now();
            const delta = durationDays * 24 * 60 * 60 * 1000;
            const newExpire = Math.max(now, vipData.vipExpireAt - delta);

            await collection.updateOne(
                { userId },
                { $set: { vipExpireAt: newExpire } }
            );
            await DragonflyDBService.del(`vip:${userId}`);
        } catch (error) {
            console.error('[VIPSystem] revokeVIP error:', error);
        }
    }

    /**
     * 更新累计充值（充值时调用）
     */
    static async updateTotalRecharge(userId: string, amount: number): Promise<void> {
        try {
            const collection = MongoDBService.getCollection<VIPData>('vip_data');
            const vipData = await this.getVIPInfo(userId);

            const newTotalRecharge = vipData.totalRecharge + amount;
            const newLevel = this.calculateVIPLevelByRecharge(newTotalRecharge);

            // 如果累计充值达到更高VIP等级要求，自动升级
            if (newLevel > vipData.vipLevel) {
                const config = this.VIP_CONFIGS[newLevel];
                await collection.updateOne(
                    { userId },
                    {
                        $set: {
                            vipLevel: newLevel,
                            privileges: config.privileges,
                            totalRecharge: newTotalRecharge,
                            lastRechargeTime: Date.now()
                        }
                    }
                );

                console.log(`[VIPSystem] User ${userId} upgraded to VIP${newLevel} by total recharge $${newTotalRecharge}`);
            } else {
                await collection.updateOne(
                    { userId },
                    {
                        $set: {
                            totalRecharge: newTotalRecharge,
                            lastRechargeTime: Date.now()
                        }
                    }
                );
            }

            // 清除缓存
            await DragonflyDBService.del(`vip:${userId}`);
        } catch (error) {
            console.error('[VIPSystem] Update total recharge error:', error);
        }
    }

    /**
     * 领取每日VIP奖励
     */
    static async claimDailyReward(userId: string): Promise<{
        success: boolean;
        rewards?: { gold: number; tickets: number };
        error?: string;
    }> {
        try {
            const vipData = await this.getVIPInfo(userId);

            if (vipData.vipLevel === 0) {
                return {
                    success: false,
                    error: '您还不是VIP'
                };
            }

            // 检查今天是否已领取
            const today = new Date().setHours(0, 0, 0, 0);
            const cacheKey = `vip:daily:${userId}:${today}`;
            const claimed = await DragonflyDBService.get(cacheKey);

            if (claimed) {
                return {
                    success: false,
                    error: '今天已经领取过了'
                };
            }

            // 发放奖励
            const rewards = {
                gold: vipData.privileges.dailyGoldBonus,
                tickets: vipData.privileges.dailyTicketBonus
            };

            await UserDB.addGold(userId, rewards.gold);
            await UserDB.addTickets(userId, rewards.tickets);

            // 标记已领取
            await DragonflyDBService.set(cacheKey, '1', 86400);  // 24小时

            console.log(`[VIPSystem] User ${userId} claimed daily VIP reward`);

            return {
                success: true,
                rewards
            };
        } catch (error) {
            console.error('[VIPSystem] Claim daily reward error:', error);
            return {
                success: false,
                error: '领取失败'
            };
        }
    }

    /**
     * 获取VIP配置
     */
    static getVIPConfig(level: VIPLevel): VIPConfig {
        return this.VIP_CONFIGS[level];
    }

    /**
     * 获取所有VIP配置
     */
    static getAllVIPConfigs(): VIPConfig[] {
        return this.VIP_CONFIGS;
    }

    /**
     * 根据累计充值计算VIP等级
     */
    private static calculateVIPLevelByRecharge(totalRecharge: number): VIPLevel {
        for (let i = this.VIP_CONFIGS.length - 1; i >= 0; i--) {
            if (totalRecharge >= this.VIP_CONFIGS[i].requiredRecharge) {
                return this.VIP_CONFIGS[i].level;
            }
        }
        return 0;
    }
}
