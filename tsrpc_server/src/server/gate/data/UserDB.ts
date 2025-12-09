import { MongoClient, Collection, ObjectId } from 'mongodb';

/** 物品类型 */
export enum ItemType {
    Skin = 'skin',           // 皮肤
    Prop = 'prop',           // 道具
    Ticket = 'ticket',       // 彩票
    NFT = 'nft'             // NFT
}

/** 物品稀有度 */
export enum ItemRarity {
    Common = 'common',       // 普通
    Rare = 'rare',          // 稀有
    Epic = 'epic',          // 史诗
    Legendary = 'legendary' // 传说
}

/** 背包物品 */
export interface InventoryItem {
    itemId: string;          // 物品ID
    itemType: ItemType;      // 物品类型
    itemName: string;        // 物品名称
    rarity: ItemRarity;      // 稀有度
    quantity: number;        // 数量
    obtainedAt: number;      // 获得时间
}

export interface UserData {
    _id?: ObjectId; // MongoDB 的 _id 字段
    userId: string; // 我们自己的业务 ID
    username: string;
    gold: number;
    lastLoginTime: number; // 上次登录时间戳

    // 抽奖系统
    tickets: number;         // 彩票数量
    inventory: InventoryItem[];  // 背包物品

    // Jackpot系统
    jackpotProgress: number; // Jackpot进度（0-100）
    totalDrops: number;      // 总投币次数

    // 统计数据
    totalRewards: number;    // 总收益
    lastRewardTime: number;  // 最后获得奖励时间

    // 其他用户数据...
    banned?: boolean;
    banReason?: string;
    banTime?: number;
    rewardRestricted?: boolean;
    restrictionReason?: string;
    restrictionTime?: number;
}

export class UserDB {
    private static client: MongoClient;
    private static usersCollection: Collection<UserData>;
    private static isInitialized: boolean = false;

    /**
     * 初始化 MongoDB 连接
     * @param mongoUri MongoDB 连接字符串
     * @param dbName 数据库名称
     * @param collectionName 集合名称
     */
    static async init(mongoUri: string, dbName: string, collectionName: string) {
        if (this.isInitialized) {
            console.warn('[UserDB] MongoDB already initialized.');
            return;
        }

        try {
            this.client = new MongoClient(mongoUri);
            await this.client.connect();
            console.log('[UserDB] Connected to MongoDB successfully!');
            const db = this.client.db(dbName);
            this.usersCollection = db.collection<UserData>(collectionName);
            this.isInitialized = true;

            // 创建索引 (可选，但推荐)
            await this.usersCollection.createIndex({ username: 1 }, { unique: true });
            await this.usersCollection.createIndex({ userId: 1 }, { unique: true });
            console.log('[UserDB] Indexes created for users collection.');

        } catch (error) {
            console.error('[UserDB] Failed to connect to MongoDB:', error);
            throw error;
        }
    }

    /**
     * 关闭 MongoDB 连接
     */
    static async close() {
        if (this.client) {
            await this.client.close();
            console.log('[UserDB] MongoDB connection closed.');
            this.isInitialized = false;
        }
    }

    static async getUser(username: string): Promise<UserData | null> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        return await this.usersCollection.findOne({ username });
    }

    static async getUserById(userId: string): Promise<UserData | null> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        return await this.usersCollection.findOne({ userId });
    }

    static async createUser(username: string): Promise<UserData> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        const newUser: UserData = {
            userId: 'u_' + Math.random().toString(36).substr(2, 9), // 确保唯一
            username,
            gold: 100, // 初始金币
            lastLoginTime: Date.now(),

            // 抽奖系统初始值
            tickets: 0,
            inventory: [],

            // Jackpot系统初始值
            jackpotProgress: 0,
            totalDrops: 0,

            // 统计数据初始值
            totalRewards: 0,
            lastRewardTime: 0
        };
        const result = await this.usersCollection.insertOne(newUser);
        if (result.insertedId) {
            newUser._id = result.insertedId; // MongoDB 会自动生成 _id
            return newUser;
        }
        throw new Error('Failed to create user');
    }

    static async updateUser(userId: string, data: Partial<UserData>): Promise<void> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        await this.usersCollection.updateOne(
            { userId },
            { $set: data }
        );
    }

    /**
     * 添加彩票（原子操作）
     */
    static async addTickets(userId: string, amount: number): Promise<number> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        const result = await this.usersCollection.findOneAndUpdate(
            { userId },
            { $inc: { tickets: amount } },
            { returnDocument: 'after' }
        );
        return result?.tickets || 0;
    }

    /**
     * 消耗彩票（原子操作）
     */
    static async consumeTickets(userId: string, amount: number): Promise<boolean> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        const result = await this.usersCollection.updateOne(
            { userId, tickets: { $gte: amount } },
            { $inc: { tickets: -amount } }
        );
        return result.modifiedCount > 0;
    }

    /**
     * 添加物品到背包
     */
    static async addItemToInventory(userId: string, item: InventoryItem): Promise<void> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');

        // 检查是否已存在相同物品
        const user = await this.getUserById(userId);
        if (!user) throw new Error('User not found');

        const existingItem = user.inventory?.find(i => i.itemId === item.itemId);

        if (existingItem) {
            // 如果存在，增加数量
            await this.usersCollection.updateOne(
                { userId, 'inventory.itemId': item.itemId },
                { $inc: { 'inventory.$.quantity': item.quantity } }
            );
        } else {
            // 如果不存在，添加新物品
            await this.usersCollection.updateOne(
                { userId },
                { $push: { inventory: item } }
            );
        }
    }

    /**
     * 更新Jackpot进度（原子操作）
     */
    static async updateJackpotProgress(userId: string, increment: number): Promise<number> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        const result = await this.usersCollection.findOneAndUpdate(
            { userId },
            {
                $inc: {
                    jackpotProgress: increment,
                    totalDrops: 1
                }
            },
            { returnDocument: 'after' }
        );
        return result?.jackpotProgress || 0;
    }

    /**
     * 重置Jackpot进度
     */
    static async resetJackpotProgress(userId: string): Promise<void> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        await this.usersCollection.updateOne(
            { userId },
            { $set: { jackpotProgress: 0 } }
        );
    }

    /**
     * 添加金币（原子操作）
     */
    static async addGold(userId: string, amount: number): Promise<number> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        const result = await this.usersCollection.findOneAndUpdate(
            { userId },
            { $inc: { gold: amount } },
            { returnDocument: 'after' }
        );
        return result?.gold || 0;
    }

    /**
     * 扣除金币（原子操作，确保余额充足）
     */
    static async deductGold(userId: string, amount: number): Promise<{
        success: boolean;
        currentGold?: number;
        error?: string;
    }> {
        if (!this.isInitialized) throw new Error('UserDB not initialized');
        const result = await this.usersCollection.findOneAndUpdate(
            { userId, gold: { $gte: amount } },
            { $inc: { gold: -amount } },
            { returnDocument: 'after' }
        );

        if (result) {
            return { success: true, currentGold: result.gold };
        }

        // 余额不足
        const user = await this.getUserById(userId);
        return {
            success: false,
            currentGold: user?.gold || 0,
            error: `金币不足，需要${amount}金币，当前${user?.gold || 0}金币`
        };
    }

    /**
     * consumeGold 别名，兼容旧接口
     */
    static async consumeGold(userId: string, amount: number) {
        return this.deductGold(userId, amount);
    }
}
