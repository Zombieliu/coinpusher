import { Collection, Db, MongoClient } from 'mongodb';

/**
 * 奖励限额数据结构
 */
export interface RewardLimitData {
    userId: string;
    date: string; // YYYY-MM-DD 格式
    totalReward: number; // 今日累计奖励
    lastUpdated: number; // 最后更新时间（毫秒）
}

/**
 * 🔒 奖励限额管理
 *
 * 功能：
 * - 每日奖励上限控制
 * - 防止单用户薅羊毛
 */
export class RewardLimitDB {
    private static db: Db;
    private static collection: Collection<RewardLimitData>;

    /**
     * 初始化数据库连接
     */
    static async init(mongoClient: MongoClient, dbName: string = 'oops_coinpusher') {
        this.db = mongoClient.db(dbName);
        this.collection = this.db.collection<RewardLimitData>('reward_limits');

        // 创建索引
        await this.createIndexes();
    }

    /**
     * 创建索引
     */
    private static async createIndexes() {
        // 复合唯一索引：用户ID + 日期
        await this.collection.createIndex(
            { userId: 1, date: 1 },
            { unique: true }
        );

        // TTL 索引：自动清理30天前的记录
        await this.collection.createIndex(
            { lastUpdated: 1 },
            { expireAfterSeconds: 30 * 24 * 60 * 60 }
        );
    }

    /**
     * 🔒 获取今日日期字符串（使用UTC时区，防止时区漏洞）
     */
    private static getTodayDate(): string {
        const now = new Date();
        // 使用UTC时间，避免跨时区玩家利用时差刷奖励
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 获取用户今日奖励统计
     */
    static async getTodayReward(userId: string): Promise<number> {
        const today = this.getTodayDate();
        const record = await this.collection.findOne({ userId, date: today });
        return record?.totalReward || 0;
    }

    /**
     * 检查是否超过每日限额
     * @param userId 用户ID
     * @param amount 本次奖励金额
     * @param dailyLimit 每日限额（默认从环境变量读取）
     * @returns {allowed: boolean, current: number, limit: number}
     */
    static async checkLimit(
        userId: string,
        amount: number,
        dailyLimit: number = parseInt(process.env.DAILY_REWARD_LIMIT || '1000', 10)
    ): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
        const current = await this.getTodayReward(userId);
        const newTotal = current + amount;

        return {
            allowed: newTotal <= dailyLimit,
            current,
            limit: dailyLimit,
            remaining: Math.max(0, dailyLimit - current)
        };
    }

    /**
     * 增加用户今日奖励（原子操作）
     * @param userId 用户ID
     * @param amount 奖励金额
     * @returns 更新后的总奖励
     */
    static async addReward(userId: string, amount: number): Promise<number> {
        const today = this.getTodayDate();
        const now = Date.now();

        const result = await this.collection.findOneAndUpdate(
            { userId, date: today },
            {
                $inc: { totalReward: amount },
                $set: { lastUpdated: now },
                $setOnInsert: { userId, date: today }
            },
            { upsert: true, returnDocument: 'after' }
        );

        return result?.totalReward || amount;
    }

    /**
     * 重置用户今日奖励（管理员功能）
     */
    static async resetTodayReward(userId: string): Promise<boolean> {
        const today = this.getTodayDate();
        const result = await this.collection.deleteOne({ userId, date: today });
        return result.deletedCount > 0;
    }

    /**
     * 获取用户历史奖励统计
     * @param userId 用户ID
     * @param days 查询天数（默认7天）
     */
    static async getRewardHistory(userId: string, days: number = 7): Promise<RewardLimitData[]> {
        const records = await this.collection
            .find({ userId })
            .sort({ date: -1 })
            .limit(days)
            .toArray();

        return records;
    }

    /**
     * 获取所有用户今日奖励排行（管理员功能）
     * @param limit 返回数量
     */
    static async getTodayLeaderboard(limit: number = 10): Promise<RewardLimitData[]> {
        const today = this.getTodayDate();
        const records = await this.collection
            .find({ date: today })
            .sort({ totalReward: -1 })
            .limit(limit)
            .toArray();

        return records;
    }

    /**
     * 获取全局今日奖励统计
     */
    static async getGlobalTodayStats(): Promise<{
        totalReward: number;
        totalUsers: number;
        avgReward: number;
    }> {
        const today = this.getTodayDate();
        const records = await this.collection.find({ date: today }).toArray();

        const totalReward = records.reduce((sum, r) => sum + r.totalReward, 0);
        const totalUsers = records.length;
        const avgReward = totalUsers > 0 ? totalReward / totalUsers : 0;

        return { totalReward, totalUsers, avgReward };
    }
}
