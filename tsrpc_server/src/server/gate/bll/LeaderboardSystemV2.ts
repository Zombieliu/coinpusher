/**
 * 🏅 排行榜系统 V2 - DragonflyDB版本
 *
 * 功能：
 * 1. 日榜/周榜/月榜/总榜
 * 2. 多维度排行（收益、投币、大奖、Jackpot）
 * 3. 自动重置
 * 4. 排名奖励
 * 5. 高性能：使用DragonflyDB Sorted Set
 *
 * 性能优势：
 * - DragonflyDB比Redis快25倍
 * - 支持百万级玩家实时排名
 * - O(log N)时间复杂度
 */

import { DragonflyDBService } from '../db/DragonflyDBService';
import { MongoDBService } from '../db/MongoDBService';
import { UserDB } from '../data/UserDB';

export enum LeaderboardType {
    Daily = 'daily',          // 日榜
    Weekly = 'weekly',        // 周榜
    Monthly = 'monthly',      // 月榜
    AllTime = 'all_time'      // 总榜
}

export enum LeaderboardCategory {
    TotalReward = 'total_reward',    // 总收益榜
    TotalDrops = 'total_drops',      // 投币榜
    BigPrizes = 'big_prizes',        // 大奖榜
    Jackpots = 'jackpots'            // Jackpot榜
}

/** 排行榜条目 */
export interface LeaderboardEntry {
    rank: number;              // 排名
    userId: string;
    username: string;
    score: number;             // 分数（根据类别不同）
    lastUpdated?: number;      // 最后更新时间
}

/** 排行榜奖励 */
export interface LeaderboardReward {
    minRank: number;           // 最小排名
    maxRank: number;           // 最大排名
    gold: number;
    tickets: number;
    title?: string;
}

export class LeaderboardSystemV2 {
    /**
     * 排行榜奖励配置（日榜/周榜/月榜通用）
     */
    private static LEADERBOARD_REWARDS: LeaderboardReward[] = [
        { minRank: 1, maxRank: 1, gold: 5000, tickets: 50, title: '冠军' },
        { minRank: 2, maxRank: 2, gold: 3000, tickets: 30, title: '亚军' },
        { minRank: 3, maxRank: 3, gold: 2000, tickets: 20, title: '季军' },
        { minRank: 4, maxRank: 10, gold: 1000, tickets: 10 },
        { minRank: 11, maxRank: 50, gold: 500, tickets: 5 },
        { minRank: 51, maxRank: 100, gold: 200, tickets: 2 }
    ];

    /**
     * 读取奖励配置：优先使用 LEADERBOARD_REWARD_CONFIG 路径或 JSON 字符串
     */
    static loadRewardConfig() {
        try {
            const path = process.env.LEADERBOARD_REWARD_CONFIG;
            if (path && require('fs').existsSync(path)) {
                const data = JSON.parse(require('fs').readFileSync(path, 'utf-8'));
                if (Array.isArray(data)) this.LEADERBOARD_REWARDS = data;
            } else if (process.env.LEADERBOARD_REWARD_JSON) {
                const data = JSON.parse(process.env.LEADERBOARD_REWARD_JSON);
                if (Array.isArray(data)) this.LEADERBOARD_REWARDS = data;
            }
        } catch (err) {
            console.warn('[LeaderboardV2] ⚠️ 奖励配置读取失败，使用默认值', (err as Error).message);
        }
    }

    /**
     * 用户名缓存（userId -> username）
     * 使用DragonflyDB Hash存储
     */
    private static readonly USERNAME_CACHE_KEY = 'leaderboard:usernames';

    /**
     * 更新排行榜分数（绝对值）
     */
    static async updateScore(
        userId: string,
        username: string,
        category: LeaderboardCategory,
        score: number,
        types: LeaderboardType[] = [LeaderboardType.Daily, LeaderboardType.AllTime]
    ): Promise<void> {
        // 缓存用户名
        await DragonflyDBService.hSet(this.USERNAME_CACHE_KEY, userId, username);

        // 更新所有类型的排行榜
        for (const type of types) {
            const key = this.getLeaderboardKey(type, category);
            await DragonflyDBService.updateLeaderboardScore(key, userId, score);
        }

        console.log(`[LeaderboardV2] 更新分数 ${userId}: ${category} = ${score}`);
    }

    /**
     * 增加排行榜分数（增量）
     */
    static async incrementScore(
        userId: string,
        username: string,
        category: LeaderboardCategory,
        increment: number,
        types: LeaderboardType[] = [LeaderboardType.Daily, LeaderboardType.AllTime]
    ): Promise<void> {
        // 缓存用户名
        await DragonflyDBService.hSet(this.USERNAME_CACHE_KEY, userId, username);

        // 增加所有类型的排行榜分数
        for (const type of types) {
            const key = this.getLeaderboardKey(type, category);
            await DragonflyDBService.incrementLeaderboardScore(key, userId, increment);
        }

        console.log(`[LeaderboardV2] 增加分数 ${userId}: ${category} +${increment}`);
    }

    /**
     * 获取排行榜
     */
    static async getLeaderboard(
        type: LeaderboardType,
        category: LeaderboardCategory,
        limit: number = 100,
        offset: number = 0
    ): Promise<LeaderboardEntry[]> {
        const key = this.getLeaderboardKey(type, category);
        const start = Math.max(0, offset);
        const end = Math.max(start, start + limit - 1);
        const results = await DragonflyDBService.getLeaderboard(key, start, end);

        // 获取用户名
        const entries: LeaderboardEntry[] = [];
        for (const result of results) {
            const username = await DragonflyDBService.hGet(this.USERNAME_CACHE_KEY, result.userId);
            entries.push({
                rank: result.rank,
                userId: result.userId,
                username: username || `User#${result.userId.substring(0, 8)}`,
                score: result.score
            });
        }

        return entries;
    }

    /**
     * 获取用户排名
     */
    static async getUserRank(
        userId: string,
        type: LeaderboardType,
        category: LeaderboardCategory
    ): Promise<{
        rank: number;
        score: number;
        total: number;
    } | null> {
        const key = this.getLeaderboardKey(type, category);

        const rank = await DragonflyDBService.getUserRank(key, userId);
        if (rank === null) {
            return null;
        }

        const score = await DragonflyDBService.getUserScore(key, userId);
        const total = await DragonflyDBService.getLeaderboardSize(key);

        return {
            rank,
            score: score || 0,
            total
        };
    }

    /**
     * 获取用户周围的排名
     */
    static async getUserSurroundings(
        userId: string,
        type: LeaderboardType,
        category: LeaderboardCategory,
        range: number = 5
    ): Promise<LeaderboardEntry[]> {
        const key = this.getLeaderboardKey(type, category);
        const results = await DragonflyDBService.getUserSurroundings(key, userId, range);

        if (!results) {
            return [];
        }

        // 获取用户名
        const entries: LeaderboardEntry[] = [];
        for (const result of results) {
            const username = await DragonflyDBService.hGet(this.USERNAME_CACHE_KEY, result.userId);
            entries.push({
                rank: result.rank,
                userId: result.userId,
                username: username || `User#${result.userId.substring(0, 8)}`,
                score: result.score
            });
        }

        return entries;
    }

    /**
     * 重置排行榜
     */
    static async resetLeaderboard(
        type: LeaderboardType,
        category: LeaderboardCategory
    ): Promise<void> {
        const key = this.getLeaderboardKey(type, category);
        await DragonflyDBService.deleteLeaderboard(key);
        console.log(`[LeaderboardV2] 重置排行榜：${key}`);
    }

    /**
     * 发放排行榜奖励
     */
    static async distributeRewards(
        type: LeaderboardType,
        category: LeaderboardCategory
    ): Promise<Array<{
        userId: string;
        rank: number;
        reward: LeaderboardReward;
    }>> {
        const leaderboard = await this.getLeaderboard(type, category, 100);
        const rewards: Array<{
            userId: string;
            rank: number;
            reward: LeaderboardReward;
        }> = [];

        for (const entry of leaderboard) {
            const reward = this.getRewardForRank(entry.rank);
            if (reward) {
                // 发放奖励
                await UserDB.updateUser(entry.userId, {
                    gold: (await UserDB.getUserById(entry.userId))!.gold + reward.gold
                });
                await UserDB.addTickets(entry.userId, reward.tickets);

                rewards.push({
                    userId: entry.userId,
                    rank: entry.rank,
                    reward
                });

                console.log(`[LeaderboardV2] 发放奖励给 ${entry.username}（#${entry.rank}）: ${reward.gold} 金币 + ${reward.tickets} 彩票`);
            }
        }

        return rewards;
    }

    /**
     * 根据排名获取奖励
     */
    private static getRewardForRank(rank: number): LeaderboardReward | null {
        for (const reward of this.LEADERBOARD_REWARDS) {
            if (rank >= reward.minRank && rank <= reward.maxRank) {
                return reward;
            }
        }
        return null;
    }

    /**
     * 获取排行榜Key
     */
    private static getLeaderboardKey(
        type: LeaderboardType,
        category: LeaderboardCategory
    ): string {
        const period = this.getCurrentPeriod(type);
        return `leaderboard:${type}:${category}:${period}`;
    }

    /**
     * 获取当前周期（用于自动重置）
     */
    private static getCurrentPeriod(type: LeaderboardType): string {
        const now = new Date();

        switch (type) {
            case LeaderboardType.Daily:
                return now.toISOString().split('T')[0]; // YYYY-MM-DD

            case LeaderboardType.Weekly:
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                return weekStart.toISOString().split('T')[0];

            case LeaderboardType.Monthly:
                return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            case LeaderboardType.AllTime:
                return 'all';

            default:
                return 'unknown';
        }
    }

    /**
     * 获取排行榜统计
     */
    static async getLeaderboardStats(
        type: LeaderboardType,
        category: LeaderboardCategory
    ): Promise<{
        totalPlayers: number;
        totalScore: number;
        avgScore: number;
        topScore: number;
    }> {
        const key = this.getLeaderboardKey(type, category);
        const leaderboard = await this.getLeaderboard(type, category, 10000);

        const totalPlayers = leaderboard.length;
        const totalScore = leaderboard.reduce((sum, e) => sum + e.score, 0);
        const avgScore = totalPlayers > 0 ? totalScore / totalPlayers : 0;
        const topScore = leaderboard.length > 0 ? leaderboard[0].score : 0;

        return {
            totalPlayers,
            totalScore,
            avgScore,
            topScore
        };
    }

    /**
     * 批量更新排行榜（用于数据迁移）
     */
    static async batchUpdateLeaderboard(
        type: LeaderboardType,
        category: LeaderboardCategory,
        entries: Array<{ userId: string; username: string; score: number }>
    ): Promise<void> {
        const key = this.getLeaderboardKey(type, category);

        // 批量更新用户名缓存
        for (const entry of entries) {
            await DragonflyDBService.hSet(this.USERNAME_CACHE_KEY, entry.userId, entry.username);
        }

        // 批量更新排行榜
        await DragonflyDBService.updateLeaderboardScoresBatch(
            key,
            entries.map(e => ({ userId: e.userId, score: e.score }))
        );

        console.log(`[LeaderboardV2] 批量更新排行榜 ${key}: ${entries.length} 条数据`);
    }

    /**
     * 清理过期排行榜（定时任务）
     */
    static async cleanupExpiredLeaderboards(): Promise<void> {
        // 清理昨天的日榜
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const yesterdayPeriod = yesterday.toISOString().split('T')[0];

        for (const category of Object.values(LeaderboardCategory)) {
            const key = `leaderboard:${LeaderboardType.Daily}:${category}:${yesterdayPeriod}`;
            await DragonflyDBService.deleteLeaderboard(key);
            console.log(`[LeaderboardV2] 清理过期排行榜：${key}`);
        }

        // 清理上周的周榜
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        lastWeek.setDate(lastWeek.getDate() - lastWeek.getDay());
        const lastWeekPeriod = lastWeek.toISOString().split('T')[0];

        for (const category of Object.values(LeaderboardCategory)) {
            const key = `leaderboard:${LeaderboardType.Weekly}:${category}:${lastWeekPeriod}`;
            await DragonflyDBService.deleteLeaderboard(key);
            console.log(`[LeaderboardV2] 清理过期排行榜：${key}`);
        }

        console.log('[LeaderboardV2] ✅ 清理完成');
    }

    /**
     * 分页获取排行榜（含总数）
     */
    static async getLeaderboardPage(
        type: LeaderboardType,
        category: LeaderboardCategory,
        page: number = 1,
        pageSize: number = 20
    ): Promise<{
        entries: LeaderboardEntry[];
        total: number;
        page: number;
        pageSize: number;
    }> {
        const safePage = Math.max(1, page);
        const safeSize = Math.min(Math.max(1, pageSize), 200);
        const offset = (safePage - 1) * safeSize;
        const [entries, total] = await Promise.all([
            this.getLeaderboard(type, category, safeSize, offset),
            this.getLeaderboardSize(type, category)
        ]);
        return { entries, total, page: safePage, pageSize: safeSize };
    }

    /**
     * 获取排行榜总量
     */
    static async getLeaderboardSize(
        type: LeaderboardType,
        category: LeaderboardCategory
    ): Promise<number> {
        const key = this.getLeaderboardKey(type, category);
        return DragonflyDBService.getLeaderboardSize(key);
    }

    /**
     * 发放奖励并记录，防重复
     */
    static async distributeRewardsWithRecord(
        type: LeaderboardType,
        category: LeaderboardCategory,
        topN: number = 100
    ): Promise<Array<{ userId: string; rank: number; reward: LeaderboardReward; skipped?: boolean }>> {
        await this.ensureIndexes();
        const period = this.getCurrentPeriod(type);
        const leaderboard = await this.getLeaderboard(type, category, topN);
        const col = MongoDBService.getCollection<LeaderboardRewardRecord>('leaderboard_rewards');
        const results: Array<{ userId: string; rank: number; reward: LeaderboardReward; skipped?: boolean }> = [];

        for (const entry of leaderboard) {
            const reward = this.getRewardForRank(entry.rank);
            if (!reward) continue;

            // 防重复发放：period+type+category+userId 唯一
            try {
                await col.insertOne({
                    period,
                    type,
                    category,
                    userId: entry.userId,
                    username: entry.username,
                    rank: entry.rank,
                    reward,
                    issuedAt: Date.now()
                });
            } catch (err: any) {
                if (err?.code === 11000) {
                    results.push({ userId: entry.userId, rank: entry.rank, reward, skipped: true });
                    continue;
                }
                throw err;
            }

            const user = await UserDB.getUserById(entry.userId);
            if (user) {
                await UserDB.updateUser(entry.userId, {
                    gold: user.gold + (reward.gold || 0)
                });
                if (reward.tickets) {
                    await UserDB.addTickets(entry.userId, reward.tickets);
                }
            }

            results.push({ userId: entry.userId, rank: entry.rank, reward, skipped: false });
            console.log(`[LeaderboardV2] 发放奖励给 ${entry.username}（#${entry.rank}）: ${reward.gold} 金币 + ${reward.tickets} 彩票`);
        }

        return results;
    }

    /**
     * 确保索引存在
     */
    static async ensureIndexes() {
        const col = MongoDBService.getCollection<LeaderboardRewardRecord>('leaderboard_rewards');
        await col.createIndex(
            { period: 1, type: 1, category: 1, userId: 1 },
            { unique: true, name: 'uniq_period_type_category_user' }
        );
    }
}

export interface LeaderboardRewardRecord {
    _id?: any;
    period: string;
    type: LeaderboardType;
    category: LeaderboardCategory;
    userId: string;
    username: string;
    rank: number;
    reward: LeaderboardReward;
    issuedAt: number;
}
