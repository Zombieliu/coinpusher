/**
 * 📤 分享系统
 *
 * 功能：
 * 1. 生成分享内容
 * 2. 分享奖励
 * 3. 分享统计
 * 4. 分享追踪
 * 5. 病毒式传播
 *
 * 分享渠道：
 * - Discord
 * - Twitter
 * - Facebook
 * - 复制链接
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';

/** 分享渠道 */
export enum ShareChannel {
    Discord = 'discord',
    Twitter = 'twitter',
    Facebook = 'facebook',
    Link = 'link',
    WeChat = 'wechat',
    QQ = 'qq'
}

/** 分享类型 */
export enum ShareType {
    Invite = 'invite',          // 邀请好友
    Achievement = 'achievement', // 成就分享
    BigPrize = 'big_prize',     // 大奖分享
    Jackpot = 'jackpot',        // Jackpot分享
    Rank = 'rank',              // 排名分享
    Season = 'season'           // 赛季分享
}

/** 分享记录 */
export interface ShareRecord {
    shareId: string;
    userId: string;
    type: ShareType;
    channel: ShareChannel;
    content: ShareContent;
    sharedAt: number;
    clicks: number;             // 点击次数
    converts: number;           // 转化次数（注册/下载）
    rewardGiven: boolean;
}

/** 分享内容 */
export interface ShareContent {
    title: string;
    description: string;
    imageUrl?: string;
    link: string;
    metadata?: any;
}

/** 分享统计 */
export interface ShareStats {
    userId: string;
    totalShares: number;
    totalClicks: number;
    totalConverts: number;
    totalRewards: number;
    sharesByChannel: { [channel: string]: number };
    sharesByType: { [type: string]: number };
}

/** 分享奖励配置 */
export interface ShareRewardConfig {
    shareReward: number;        // 分享奖励（金币）
    clickReward: number;        // 每次点击奖励
    convertReward: number;      // 每次转化奖励
    dailyShareLimit: number;    // 每日分享奖励上限
}

export class ShareSystem {
    /**
     * 奖励配置
     */
    private static readonly REWARD_CONFIG: ShareRewardConfig = {
        shareReward: 5,
        clickReward: 1,
        convertReward: 10,
        dailyShareLimit: 50
    };

    /**
     * 生成分享内容
     */
    static async generateShareContent(
        userId: string,
        type: ShareType,
        metadata?: any
    ): Promise<ShareContent> {
        const user = await UserDB.getUserById(userId);
        const username = user?.username || 'Player';

        let content: ShareContent;

        switch (type) {
            case ShareType.Invite:
                const { InviteSystem } = await import('./InviteSystem');
                const inviteInfo = await InviteSystem.getUserInviteInfo(userId);
                content = {
                    title: `Join me in Numeron Push!`,
                    description: `${username} invites you to play the best coin pusher game!`,
                    link: inviteInfo.inviteLink,
                    metadata: { inviteCode: inviteInfo.inviteCode }
                };
                break;

            case ShareType.Achievement:
                content = {
                    title: `🏆 Achievement Unlocked!`,
                    description: `${username} just unlocked: ${metadata?.achievementName}`,
                    link: `https://game.example.com/user/${userId}`,
                    metadata
                };
                break;

            case ShareType.BigPrize:
                content = {
                    title: `💰 Big Win!`,
                    description: `${username} won ${metadata?.amount} coins!`,
                    link: `https://game.example.com/`,
                    imageUrl: `https://cdn.example.com/bigwin.png`,
                    metadata
                };
                break;

            case ShareType.Jackpot:
                content = {
                    title: `🎰 JACKPOT!!!`,
                    description: `${username} hit the JACKPOT! ${metadata?.amount} coins!`,
                    link: `https://game.example.com/`,
                    imageUrl: `https://cdn.example.com/jackpot.gif`,
                    metadata
                };
                break;

            case ShareType.Rank:
                content = {
                    title: `📊 Leaderboard #${metadata?.rank}`,
                    description: `${username} ranked #${metadata?.rank} with ${metadata?.score} points!`,
                    link: `https://game.example.com/leaderboard`,
                    metadata
                };
                break;

            case ShareType.Season:
                content = {
                    title: `🎮 Season ${metadata?.seasonNumber}`,
                    description: `${username} reached Level ${metadata?.level} in Season ${metadata?.seasonNumber}!`,
                    link: `https://game.example.com/season`,
                    metadata
                };
                break;

            default:
                content = {
                    title: 'Numeron Push',
                    description: 'Play the best coin pusher game!',
                    link: 'https://game.example.com/'
                };
        }

        return content;
    }

    /**
     * 分享（创建分享记录）
     */
    static async share(
        userId: string,
        type: ShareType,
        channel: ShareChannel,
        metadata?: any
    ): Promise<{
        success: boolean;
        error?: string;
        shareId?: string;
        content?: ShareContent;
        reward?: number;
    }> {
        // 检查每日分享奖励上限
        const todayRewards = await this.getTodayShareRewards(userId);
        if (todayRewards >= this.REWARD_CONFIG.dailyShareLimit) {
            return { success: false, error: '今日分享奖励已达上限' };
        }

        // 生成分享内容
        const content = await this.generateShareContent(userId, type, metadata);

        // 创建分享记录
        const shareId = `share_${Date.now()}_${userId}`;
        const record: ShareRecord = {
            shareId,
            userId,
            type,
            channel,
            content,
            sharedAt: Date.now(),
            clicks: 0,
            converts: 0,
            rewardGiven: false
        };

        const collection = MongoDBService.getCollection<ShareRecord>('share_records');
        await collection.insertOne(record);

        // 发放分享奖励
        const reward = await this.giveShareReward(userId);

        // 更新统计
        await this.updateShareStats(userId, type, channel);

        console.log(`[ShareSystem] 用户 ${userId} 分享了 ${type} 到 ${channel}`);

        return {
            success: true,
            shareId,
            content,
            reward
        };
    }

    /**
     * 追踪分享点击
     */
    static async trackClick(shareId: string): Promise<void> {
        const collection = MongoDBService.getCollection<ShareRecord>('share_records');
        const record = await collection.findOne({ shareId });

        if (!record) {
            return;
        }

        // 增加点击数
        await collection.updateOne(
            { shareId },
            { $inc: { clicks: 1 } }
        );

        // 给分享者奖励
        await this.giveClickReward(record.userId);

        console.log(`[ShareSystem] 分享 ${shareId} 被点击`);
    }

    /**
     * 追踪分享转化
     */
    static async trackConvert(shareId: string, convertUserId: string): Promise<void> {
        const collection = MongoDBService.getCollection<ShareRecord>('share_records');
        const record = await collection.findOne({ shareId });

        if (!record) {
            return;
        }

        // 增加转化数
        await collection.updateOne(
            { shareId },
            { $inc: { converts: 1 } }
        );

        // 给分享者奖励
        await this.giveConvertReward(record.userId);

        // 更新统计
        const statsCollection = MongoDBService.getCollection<ShareStats>('share_stats');
        await statsCollection.updateOne(
            { userId: record.userId },
            { $inc: { totalConverts: 1 } }
        );

        console.log(`[ShareSystem] 分享 ${shareId} 转化了用户 ${convertUserId}`);
    }

    /**
     * 发放分享奖励
     */
    private static async giveShareReward(userId: string): Promise<number> {
        const reward = this.REWARD_CONFIG.shareReward;

        const user = await UserDB.getUserById(userId);
        if (user) {
            await UserDB.updateUser(userId, {
                gold: user.gold + reward
            });

            // 更新统计
            const statsCollection = MongoDBService.getCollection<ShareStats>('share_stats');
            await statsCollection.updateOne(
                { userId },
                { $inc: { totalRewards: reward } },
                { upsert: true }
            );
        }

        return reward;
    }

    /**
     * 发放点击奖励
     */
    private static async giveClickReward(userId: string): Promise<void> {
        const todayRewards = await this.getTodayShareRewards(userId);
        if (todayRewards >= this.REWARD_CONFIG.dailyShareLimit) {
            return;
        }

        const reward = this.REWARD_CONFIG.clickReward;

        const user = await UserDB.getUserById(userId);
        if (user) {
            await UserDB.updateUser(userId, {
                gold: user.gold + reward
            });

            // 更新统计
            const statsCollection = MongoDBService.getCollection<ShareStats>('share_stats');
            await statsCollection.updateOne(
                { userId },
                { $inc: { totalRewards: reward, totalClicks: 1 } },
                { upsert: true }
            );
        }
    }

    /**
     * 发放转化奖励
     */
    private static async giveConvertReward(userId: string): Promise<void> {
        const reward = this.REWARD_CONFIG.convertReward;

        const user = await UserDB.getUserById(userId);
        if (user) {
            await UserDB.updateUser(userId, {
                gold: user.gold + reward
            });

            // 更新统计
            const statsCollection = MongoDBService.getCollection<ShareStats>('share_stats');
            await statsCollection.updateOne(
                { userId },
                { $inc: { totalRewards: reward } },
                { upsert: true }
            );
        }
    }

    /**
     * 获取今日分享奖励总额
     */
    private static async getTodayShareRewards(userId: string): Promise<number> {
        const cacheKey = `share:daily_rewards:${userId}:${new Date().toISOString().split('T')[0]}`;
        const cached = await DragonflyDBService.get(cacheKey);

        if (cached) {
            return parseInt(cached);
        }

        // 从MongoDB统计
        const collection = MongoDBService.getCollection<ShareRecord>('share_records');
        const today = new Date().toISOString().split('T')[0];
        const todayStart = new Date(today).getTime();

        const records = await collection.find({
            userId,
            sharedAt: { $gte: todayStart }
        }).toArray();

        const totalRewards = records.length * this.REWARD_CONFIG.shareReward;

        // 缓存到DragonflyDB
        await DragonflyDBService.set(cacheKey, totalRewards.toString(), 3600);

        return totalRewards;
    }

    /**
     * 更新分享统计
     */
    private static async updateShareStats(
        userId: string,
        type: ShareType,
        channel: ShareChannel
    ): Promise<void> {
        const collection = MongoDBService.getCollection<ShareStats>('share_stats');

        await collection.updateOne(
            { userId },
            {
                $inc: {
                    totalShares: 1,
                    [`sharesByChannel.${channel}`]: 1,
                    [`sharesByType.${type}`]: 1
                }
            },
            { upsert: true }
        );
    }

    /**
     * 获取分享统计
     */
    static async getShareStats(userId: string): Promise<ShareStats | null> {
        const collection = MongoDBService.getCollection<ShareStats>('share_stats');
        return await collection.findOne({ userId });
    }

    /**
     * 获取用户分享历史
     */
    static async getShareHistory(userId: string, limit: number = 50): Promise<ShareRecord[]> {
        const collection = MongoDBService.getCollection<ShareRecord>('share_records');
        return await collection
            .find({ userId })
            .sort({ sharedAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取分享排行榜
     */
    static async getShareLeaderboard(limit: number = 100): Promise<Array<{
        userId: string;
        totalShares: number;
        totalConverts: number;
        totalRewards: number;
    }>> {
        const collection = MongoDBService.getCollection<ShareStats>('share_stats');
        const stats = await collection
            .find()
            .sort({ totalConverts: -1 })
            .limit(limit)
            .toArray();

        return stats.map(s => ({
            userId: s.userId,
            totalShares: s.totalShares,
            totalConverts: s.totalConverts,
            totalRewards: s.totalRewards
        }));
    }
}
