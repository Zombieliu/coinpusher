import { MongoClient, Collection, ObjectId } from 'mongodb';

/**
 * 事务日志数据结构
 * 用于实现幂等性 - 防止重复扣费/加币
 */
export interface TransactionData {
    _id?: ObjectId;

    /** 事务唯一ID */
    transactionId: string;

    /** 用户ID */
    userId: string;

    /** 事务类型: 'deduct' | 'add' */
    type: 'deduct' | 'add';

    /** 金额 */
    amount: number;

    /** 事务原因 */
    reason: string;

    /** 事务结果（成功/失败） */
    success: boolean;

    /** 事务后的余额 */
    balance: number;

    /** 创建时间戳 */
    createdAt: number;
    /** 兼容旧字段 */
    timestamp?: number;

    /** 错误信息（如果失败） */
    error?: string;
}

/**
 * 事务日志系统
 *
 * 核心功能：
 * 1. 幂等性保证：同一个 transactionId 只会被处理一次
 * 2. 审计追踪：所有金币变动都有完整记录
 * 3. 对账支持：将来可以和链上状态对账
 */
export class TransactionLog {
    private static client: MongoClient;
    private static _collection: Collection<TransactionData>;
    private static isInitialized: boolean = false;

    /**
     * 初始化 TransactionLog
     * @param client 已连接的 MongoDB 客户端
     * @param dbName 数据库名称
     */
    static async init(client: MongoClient, dbName: string) {
        if (this.isInitialized) {
            console.warn('[TransactionLog] Already initialized.');
            return;
        }

        try {
            this.client = client;
            const db = this.client.db(dbName);
            this._collection = db.collection<TransactionData>('transactions');
            this.isInitialized = true;

            // 创建索引
            // 1. transactionId 唯一索引 - 实现幂等性的关键
            await this._collection.createIndex(
                { transactionId: 1 },
                { unique: true }
            );

            // 2. userId + createdAt 复合索引 - 用于查询用户交易历史
            await this._collection.createIndex(
                { userId: 1, createdAt: -1 }
            );

            // 3. TTL 索引 - 自动清理90天前的记录（可选）
            await this._collection.createIndex(
                { createdAt: 1 },
                { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90天
            );

            console.log('[TransactionLog] Initialized successfully with indexes.');
        } catch (error) {
            console.error('[TransactionLog] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * 检查事务是否已存在（幂等性检查）
     * @param transactionId 事务ID
     * @returns 如果存在返回事务记录，否则返回 null
     */
    static async exists(transactionId: string): Promise<TransactionData | null> {
        if (!this.isInitialized) throw new Error('TransactionLog not initialized');

        return await this.collection.findOne({ transactionId });
    }

    /**
     * 记录事务（原子操作）
     * @param data 事务数据
     * @returns 插入成功返回 true，transactionId 冲突返回 false
     */
    static async record(data: Omit<TransactionData, '_id' | 'createdAt'>): Promise<boolean> {
        if (!this.isInitialized) throw new Error('TransactionLog not initialized');

        try {
            const transaction: TransactionData = {
                ...data,
                createdAt: Date.now(),
                timestamp: Date.now()
            };

            await this.collection.insertOne(transaction);
            return true;
        } catch (error: any) {
            // MongoDB 唯一索引冲突错误码: 11000
            if (error.code === 11000) {
                console.warn(`[TransactionLog] Duplicate transactionId: ${data.transactionId}`);
                return false;
            }
            throw error;
        }
    }

    /**
     * 获取用户交易历史
     * @param userId 用户ID
     * @param limit 返回条数
     */
    static async getUserHistory(userId: string, limit: number = 100): Promise<TransactionData[]> {
        if (!this.isInitialized) throw new Error('TransactionLog not initialized');

        return await this.collection
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 计算用户总收入/支出（用于对账）
     */
    static async getUserStats(userId: string): Promise<{
        totalDeducted: number;
        totalAdded: number;
        transactionCount: number;
    }> {
        if (!this.isInitialized) throw new Error('TransactionLog not initialized');

        const pipeline = [
            { $match: { userId, success: true } },
            {
                $group: {
                    _id: null,
                    totalDeducted: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'deduct'] }, '$amount', 0]
                        }
                    },
                    totalAdded: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'add'] }, '$amount', 0]
                        }
                    },
                    transactionCount: { $sum: 1 }
                }
            }
        ];

        const result = await this.collection.aggregate<{
            totalDeducted: number;
            totalAdded: number;
            transactionCount: number;
        }>(pipeline).toArray();

        if (result.length === 0) {
            return { totalDeducted: 0, totalAdded: 0, transactionCount: 0 };
        }

        return result[0];
    }

    /**
     * 对外暴露集合（仅在需要复杂查询时使用）
     */
    static get collection(): Collection<TransactionData> {
        if (!this.isInitialized || !this._collection) {
            throw new Error('TransactionLog not initialized');
        }
        return this._collection;
    }

    /**
     * 获取指定事务
     */
    static async getTransaction(transactionId: string): Promise<TransactionData | null> {
        return this.exists(transactionId);
    }

    /**
     * 兼容旧命名
     */
    static async recordTransaction(data: Omit<TransactionData, '_id' | 'createdAt'>): Promise<boolean> {
        return this.record(data);
    }
}
