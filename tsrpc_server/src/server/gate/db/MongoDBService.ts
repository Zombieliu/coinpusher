/**
 * 🗄️ MongoDB Service
 *
 * 功能：
 * 1. MongoDB连接管理
 * 2. 集合操作封装
 * 3. 事务支持
 * 4. 索引管理
 *
 * 集合列表：
 * - users: 用户基础数据
 * - user_tasks: 用户任务数据
 * - user_achievements: 用户成就数据
 * - user_seasons: 用户赛季数据
 * - user_checkins: 用户签到数据
 * - user_social: 用户社交数据
 * - guilds: 公会数据
 */

import { MongoClient, Db, Collection, ClientSession, Document } from 'mongodb';

export class MongoDBService {
    private static client: MongoClient;
    private static db: Db;
    private static isConnected: boolean = false;

    /**
     * 连接MongoDB
     */
    static async connect(uri: string, dbName: string): Promise<void> {
        if (this.isConnected) {
            console.log('[MongoDB] Already connected');
            return;
        }

        try {
            this.client = new MongoClient(uri, {
                maxPoolSize: 50,
                minPoolSize: 10,
                retryWrites: true,
                w: 'majority'
            });

            await this.client.connect();
            this.db = this.client.db(dbName);
            this.isConnected = true;

            console.log(`[MongoDB] ✅ Connected to database: ${dbName}`);

            // 创建索引
            await this.createIndexes();
        } catch (error) {
            console.error('[MongoDB] ❌ Connection failed:', error);
            throw error;
        }
    }

    /**
     * 断开连接
     */
    static async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.isConnected = false;
            console.log('[MongoDB] Disconnected');
        }
    }

    /**
     * 获取数据库实例
     */
    static getDb(): Db {
        if (!this.isConnected) {
            throw new Error('[MongoDB] Not connected to database');
        }
        return this.db;
    }

    /**
     * 获取集合
     */
    static getCollection<T extends Document = Document>(name: string): Collection<T> {
        return this.getDb().collection<T>(name);
    }

    /**
     * 判断集合是否存在
     */
    static async collectionExist(name: string): Promise<boolean> {
        const collections = await this.getDb().listCollections({ name }).toArray();
        return collections.length > 0;
    }

    /**
     * 兼容旧接口
     */
    static getDatabase(): Db {
        return this.getDb();
    }

    /**
     * 开始事务
     */
    static async startTransaction<T>(
        callback: (session: ClientSession) => Promise<T>
    ): Promise<T> {
        const session = this.client.startSession();

        try {
            let result: T;

            await session.withTransaction(async () => {
                result = await callback(session);
            });

            return result!;
        } finally {
            await session.endSession();
        }
    }

    /**
     * 创建索引
     */
    private static async createIndexes(): Promise<void> {
        console.log('[MongoDB] Creating indexes...');

        try {
            // users集合索引
            const users = this.getCollection('users');
            await users.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
            await users.createIndex({ username: 1 }).catch(() => {});
            await users.createIndex({ lastLoginTime: -1 }).catch(() => {});

            // user_tasks集合索引
            const userTasks = this.getCollection('user_tasks');
            await userTasks.createIndex({ userId: 1, taskType: 1 }).catch(() => {});
            await userTasks.createIndex({ userId: 1, taskId: 1 }, { unique: true }).catch(() => {});
            await userTasks.createIndex({ refreshDate: 1 }).catch(() => {});

            // user_achievements集合索引
            const userAchievements = this.getCollection('user_achievements');
            await userAchievements.createIndex({ userId: 1 }).catch(() => {});
            await userAchievements.createIndex({ userId: 1, achievementId: 1 }, { unique: true }).catch(() => {});
            await userAchievements.createIndex({ status: 1 }).catch(() => {});

            // user_seasons集合索引
            const userSeasons = this.getCollection('user_seasons');
            await userSeasons.createIndex({ userId: 1, seasonId: 1 }, { unique: true }).catch(() => {});
            await userSeasons.createIndex({ seasonId: 1, level: -1 }).catch(() => {});

            // user_checkins集合索引
            const userCheckins = this.getCollection('user_checkins');
            await userCheckins.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
            await userCheckins.createIndex({ lastCheckinDate: 1 }).catch(() => {});

            // user_social集合索引
            const userSocial = this.getCollection('user_social');
            await userSocial.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
            await userSocial.createIndex({ 'friends.userId': 1 }).catch(() => {});
            await userSocial.createIndex({ guildId: 1 }).catch(() => {});

            // guilds集合索引
            const guilds = this.getCollection('guilds');
            await guilds.createIndex({ guildId: 1 }, { unique: true }).catch(() => {});
            await guilds.createIndex({ name: 1 }, { unique: true }).catch(() => {});
            await guilds.createIndex({ level: -1, exp: -1 }).catch(() => {});

            console.log('[MongoDB] ✅ Indexes created');
        } catch (error: any) {
            console.log('[MongoDB] ⚠️  Index creation completed with some errors (ignored):', error.message);
        }
    }

    /**
     * 健康检查
     */
    static async healthCheck(): Promise<boolean> {
        try {
            await this.db.admin().ping();
            return true;
        } catch (error) {
            console.error('[MongoDB] Health check failed:', error);
            return false;
        }
    }

    /**
     * 获取集合统计
     */
    static async getCollectionStats(collectionName: string): Promise<any> {
        const result = await this.db.command({ collStats: collectionName });
        return result;
    }
}
