/**
 * 🏅 排行榜系统
 *
 * 功能：
 * 1. 日榜/周榜/月榜
 * 2. 多维度排行（收益、投币、大奖）
 * 3. 自动重置
 * 4. 排名奖励
 *
 * 注意：本实现使用内存存储，生产环境应使用 Redis/DragonflyDB 的 Sorted Set
 */

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
    lastUpdated: number;       // 最后更新时间
}

/** 排行榜奖励 */
export interface LeaderboardReward {
    minRank: number;           // 最小排名
    maxRank: number;           // 最大排名
    gold: number;
    tickets: number;
    title?: string;
}

export class LeaderboardSystem {
    /**
     * 排行榜奖励配置（日榜/周榜/月榜通用）
     */
    private static readonly LEADERBOARD_REWARDS: LeaderboardReward[] = [
        { minRank: 1, maxRank: 1, gold: 5000, tickets: 50, title: '冠军' },
        { minRank: 2, maxRank: 2, gold: 3000, tickets: 30, title: '亚军' },
        { minRank: 3, maxRank: 3, gold: 2000, tickets: 20, title: '季军' },
        { minRank: 4, maxRank: 10, gold: 1000, tickets: 10 },
        { minRank: 11, maxRank: 50, gold: 500, tickets: 5 },
        { minRank: 51, maxRank: 100, gold: 200, tickets: 2 }
    ];

    /**
     * 内存存储
     * Key: `${type}_${category}_${period}`
     * Value: Map<userId, LeaderboardEntry>
     *
     * 生产环境应使用 Redis Sorted Set:
     * ZADD leaderboard:daily:total_reward userId score
     * ZREVRANK leaderboard:daily:total_reward userId
     * ZREVRANGE leaderboard:daily:total_reward 0 99 WITHSCORES
     */
    private static leaderboards = new Map<string, Map<string, LeaderboardEntry>>();

    /**
     * 更新排行榜分数
     */
    static async updateScore(
        userId: string,
        username: string,
        category: LeaderboardCategory,
        score: number,
        type: LeaderboardType = LeaderboardType.Daily
    ): Promise<void> {
        const key = this.getLeaderboardKey(type, category);
        let leaderboard = this.leaderboards.get(key);

        if (!leaderboard) {
            leaderboard = new Map();
            this.leaderboards.set(key, leaderboard);
        }

        const entry: LeaderboardEntry = {
            rank: 0, // 排名在获取时计算
            userId,
            username,
            score,
            lastUpdated: Date.now()
        };

        leaderboard.set(userId, entry);
    }

    /**
     * 获取排行榜
     */
    static async getLeaderboard(
        type: LeaderboardType,
        category: LeaderboardCategory,
        limit: number = 100
    ): Promise<LeaderboardEntry[]> {
        const key = this.getLeaderboardKey(type, category);
        const leaderboard = this.leaderboards.get(key);

        if (!leaderboard) {
            return [];
        }

        // 转换为数组并排序
        const entries = Array.from(leaderboard.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        // 设置排名
        entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });

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
        const leaderboard = this.leaderboards.get(key);

        if (!leaderboard || !leaderboard.has(userId)) {
            return null;
        }

        // 计算排名
        const userEntry = leaderboard.get(userId)!;
        const allEntries = Array.from(leaderboard.values())
            .sort((a, b) => b.score - a.score);

        const rank = allEntries.findIndex(e => e.userId === userId) + 1;

        return {
            rank,
            score: userEntry.score,
            total: allEntries.length
        };
    }

    /**
     * 重置排行榜
     */
    static async resetLeaderboard(
        type: LeaderboardType,
        category: LeaderboardCategory
    ): Promise<void> {
        const key = this.getLeaderboardKey(type, category);
        this.leaderboards.delete(key);
        console.log(`[LeaderboardSystem] 重置排行榜：${key}`);
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
                rewards.push({
                    userId: entry.userId,
                    rank: entry.rank,
                    reward
                });

                // TODO: 实际发放奖励到用户账户
                console.log(`[LeaderboardSystem] 发放奖励给 ${entry.username}（#${entry.rank}）: ${reward.gold} 金币 + ${reward.tickets} 彩票`);
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
        return `${type}_${category}_${period}`;
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
     * 获取用户周围的排名
     */
    static async getUserSurroundings(
        userId: string,
        type: LeaderboardType,
        category: LeaderboardCategory,
        range: number = 5
    ): Promise<LeaderboardEntry[]> {
        const fullLeaderboard = await this.getLeaderboard(type, category, 10000);
        const userIndex = fullLeaderboard.findIndex(e => e.userId === userId);

        if (userIndex === -1) {
            return [];
        }

        const start = Math.max(0, userIndex - range);
        const end = Math.min(fullLeaderboard.length, userIndex + range + 1);

        return fullLeaderboard.slice(start, end);
    }
}
