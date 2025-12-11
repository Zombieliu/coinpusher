import { MongoClient } from 'mongodb';

/**
 * 初始化MongoDB索引
 * 为所有Phase 1-3系统创建必要的数据库索引以优化查询性能
 */
export class InitIndexes {
    private static client: MongoClient;
    private static dbName: string = 'coin_pusher_game';

    /**
     * 初始化数据库连接
     */
    static async init(mongoUrl: string, dbName?: string) {
        this.client = new MongoClient(mongoUrl);
        await this.client.connect();
        if (dbName) {
            this.dbName = dbName;
        }
        console.log('[InitIndexes] Connected to MongoDB');
    }

    /**
     * 创建所有索引
     */
    static async createAllIndexes() {
        try {
            const db = this.client.db(this.dbName);

            console.log('[InitIndexes] Creating indexes for Item System...');
            await this.createItemIndexes(db);

            console.log('[InitIndexes] Creating indexes for Buff System...');
            await this.createBuffIndexes(db);

            console.log('[InitIndexes] Creating indexes for Inventory System...');
            await this.createInventoryIndexes(db);

            console.log('[InitIndexes] Creating indexes for Shop System...');
            await this.createShopIndexes(db);

            console.log('[InitIndexes] Creating indexes for Payment System...');
            await this.createPaymentIndexes(db);

            console.log('[InitIndexes] Creating indexes for CDK System...');
            await this.createCdkIndexes(db);

            console.log('[InitIndexes] Creating indexes for Invite System...');
            await this.createInviteIndexes(db);

            console.log('[InitIndexes] Creating indexes for Share System...');
            await this.createShareIndexes(db);

            console.log('[InitIndexes] Creating indexes for Sign-in System...');
            await this.createSignInIndexes(db);

            console.log('[InitIndexes] Creating indexes for Level System...');
            await this.createLevelIndexes(db);

            console.log('[InitIndexes] Creating indexes for Mail System...');
            await this.createMailIndexes(db);

            console.log('[InitIndexes] Creating indexes for VIP System...');
            await this.createVIPIndexes(db);

            console.log('[InitIndexes] Creating indexes for Battle Pass System...');
            await this.createBattlePassIndexes(db);

            console.log('[InitIndexes] Creating indexes for Skin System...');
            await this.createSkinIndexes(db);

            console.log('[InitIndexes] Creating indexes for Event System...');
            await this.createEventIndexes(db);

            console.log('[InitIndexes] Creating indexes for User System...');
            await this.createUserIndexes(db);

            console.log('[InitIndexes] Creating indexes for Admin System...');
            await this.createAdminIndexes(db);

            console.log('[InitIndexes] All indexes created successfully!');
        } catch (error) {
            console.error('[InitIndexes] Error creating indexes:', error);
            throw error;
        }
    }

    /**
     * 道具系统索引
     */
    private static async createItemIndexes(db: any) {
        const items = db.collection('items');
        const itemOwnership = db.collection('item_ownership');
        const itemCooldowns = db.collection('item_cooldowns');

        // items集合索引
        await items.createIndex({ itemId: 1 }, { unique: true });
        await items.createIndex({ itemType: 1 });
        await items.createIndex({ enabled: 1 });

        // item_ownership集合索引
        await itemOwnership.createIndex({ userId: 1, itemId: 1 }, { unique: true });
        await itemOwnership.createIndex({ userId: 1 });
        await itemOwnership.createIndex({ itemId: 1 });
        await itemOwnership.createIndex({ quantity: 1 });

        // item_cooldowns集合索引
        await itemCooldowns.createIndex({ userId: 1, itemId: 1 }, { unique: true });
        await itemCooldowns.createIndex({ userId: 1 });
        await itemCooldowns.createIndex({ lastUsedAt: 1 });
        await itemCooldowns.createIndex({ nextAvailableAt: 1 });
    }

    /**
     * Buff系统索引
     */
    private static async createBuffIndexes(db: any) {
        const buffs = db.collection('buffs');

        // buffs集合索引
        await buffs.createIndex({ buffId: 1 }, { unique: true });
        await buffs.createIndex({ userId: 1 });
        await buffs.createIndex({ buffType: 1 });
        await buffs.createIndex({ userId: 1, active: 1 });
        await buffs.createIndex({ endTime: 1 }); // 用于定时清理过期buff
        await buffs.createIndex({ userId: 1, buffType: 1, active: 1 });
    }

    /**
     * 背包系统索引
     */
    private static async createInventoryIndexes(db: any) {
        const inventories = db.collection('inventories');

        // inventories集合索引
        await inventories.createIndex({ userId: 1 }, { unique: true });
        await inventories.createIndex({ maxSlots: 1 });
        await inventories.createIndex({ expandCount: 1 });
    }

    /**
     * 商城系统索引
     */
    private static async createShopIndexes(db: any) {
        const products = db.collection('shop_products');
        const purchaseHistory = db.collection('purchase_history');
        const purchaseLimits = db.collection('purchase_limits');

        // shop_products集合索引
        await products.createIndex({ productId: 1 }, { unique: true });
        await products.createIndex({ category: 1 });
        await products.createIndex({ available: 1 });
        await products.createIndex({ category: 1, available: 1 });
        await products.createIndex({ price: 1 });

        // purchase_history集合索引
        await purchaseHistory.createIndex({ orderId: 1 }, { unique: true });
        await purchaseHistory.createIndex({ userId: 1 });
        await purchaseHistory.createIndex({ productId: 1 });
        await purchaseHistory.createIndex({ purchaseTime: 1 });
        await purchaseHistory.createIndex({ userId: 1, purchaseTime: -1 });
        await purchaseHistory.createIndex({ userId: 1, productId: 1 });

        // purchase_limits集合索引
        await purchaseLimits.createIndex({ userId: 1, productId: 1, period: 1 }, { unique: true });
        await purchaseLimits.createIndex({ userId: 1 });
        await purchaseLimits.createIndex({ resetTime: 1 }); // 用于定时重置限制
    }

    /**
     * 支付系统索引
     */
    private static async createPaymentIndexes(db: any) {
        const paymentOrders = db.collection('payment_orders');
        const paymentCallbacks = db.collection('payment_callbacks');

        // payment_orders集合索引
        await paymentOrders.createIndex({ orderId: 1 }, { unique: true });
        await paymentOrders.createIndex({ userId: 1 });
        await paymentOrders.createIndex({ status: 1 });
        await paymentOrders.createIndex({ channel: 1 });
        await paymentOrders.createIndex({ createdAt: 1 });
        await paymentOrders.createIndex({ userId: 1, status: 1 });
        await paymentOrders.createIndex({ userId: 1, createdAt: -1 });
        await paymentOrders.createIndex({ status: 1, createdAt: 1 }); // 用于清理超时订单

        // payment_callbacks集合索引
        await paymentCallbacks.createIndex({ orderId: 1 });
        await paymentCallbacks.createIndex({ callbackTime: 1 });
        await paymentCallbacks.createIndex({ orderId: 1, callbackTime: -1 });
    }

    /**
     * CDK系统索引
     */
    private static async createCdkIndexes(db: any) {
        const cdkCodes = db.collection('cdk_codes');
        const cdkUsageLogs = db.collection('cdk_usage_logs');
        const cdkAdminLogs = db.collection('cdk_admin_logs');

        await cdkCodes.createIndex({ code: 1 }, { unique: true });
        await cdkCodes.createIndex({ batchId: 1 });
        await cdkCodes.createIndex({ createdAt: -1 });
        await cdkCodes.createIndex({ active: 1 });

        await cdkUsageLogs.createIndex({ code: 1 });
        await cdkUsageLogs.createIndex({ userId: 1 });
        await cdkUsageLogs.createIndex({ usedAt: -1 });
        await cdkUsageLogs.createIndex({ batchId: 1 });

        await cdkAdminLogs.createIndex({ actionId: 1 }, { unique: true });
        await cdkAdminLogs.createIndex({ action: 1, createdAt: -1 });
        await cdkAdminLogs.createIndex({ batchId: 1 });
        await cdkAdminLogs.createIndex({ code: 1 });
        await cdkAdminLogs.createIndex({ adminId: 1, createdAt: -1 });
    }

    /**
     * 邀请系统索引
     */
    private static async createInviteIndexes(db: any) {
        const inviteRelations = db.collection('invite_relations');
        const inviteStats = db.collection('invite_stats');
        const inviteConfig = db.collection('invite_reward_configs');
        const inviteConfigHistory = db.collection('invite_reward_config_history');

        // invite_relations集合索引
        await inviteRelations.createIndex({ inviterId: 1 });
        await inviteRelations.createIndex({ inviteeId: 1 }, { unique: true });
        await inviteRelations.createIndex({ inviteCode: 1 });
        await inviteRelations.createIndex({ invitedAt: 1 });
        await inviteRelations.createIndex({ inviterId: 1, invitedAt: -1 });

        // invite_stats集合索引
        await inviteStats.createIndex({ userId: 1 }, { unique: true });
        await inviteStats.createIndex({ totalInvites: 1 });
        await inviteStats.createIndex({ totalRewards: 1 });

        await inviteConfig.createIndex({ status: 1, updatedAt: -1 });
        await inviteConfig.createIndex({ version: -1 }, { unique: true });
        await inviteConfigHistory.createIndex({ historyId: 1 }, { unique: true });
        await inviteConfigHistory.createIndex({ createdAt: -1 });
        await inviteConfigHistory.createIndex({ reviewStatus: 1, createdAt: -1 });
    }

    /**
     * 分享系统索引
     */
    private static async createShareIndexes(db: any) {
        const shareRecords = db.collection('share_records');
        const shareStats = db.collection('share_stats');

        // share_records集合索引
        await shareRecords.createIndex({ shareId: 1 }, { unique: true });
        await shareRecords.createIndex({ userId: 1 });
        await shareRecords.createIndex({ shareType: 1 });
        await shareRecords.createIndex({ channel: 1 });
        await shareRecords.createIndex({ sharedAt: 1 });
        await shareRecords.createIndex({ userId: 1, sharedAt: -1 });
        await shareRecords.createIndex({ userId: 1, shareType: 1 });

        // share_stats集合索引
        await shareStats.createIndex({ userId: 1 }, { unique: true });
        await shareStats.createIndex({ totalShares: 1 });
        await shareStats.createIndex({ totalClicks: 1 });
        await shareStats.createIndex({ totalConversions: 1 });
        await shareStats.createIndex({ totalRewards: 1 });
        await shareStats.createIndex({ lastShareDate: 1 });
    }

    /**
     * 签到系统索引
     */
    private static async createSignInIndexes(db: any) {
        const signInRecords = db.collection('sign_in_records');

        await signInRecords.createIndex({ userId: 1 }, { unique: true });
        await signInRecords.createIndex({ signInDate: 1 });
        await signInRecords.createIndex({ consecutiveDays: 1 });
        await signInRecords.createIndex({ totalDays: 1 });
        await signInRecords.createIndex({ lastSignInTime: 1 });
    }

    /**
     * 等级系统索引
     */
    private static async createLevelIndexes(db: any) {
        const levelData = db.collection('level_data');

        await levelData.createIndex({ userId: 1 }, { unique: true });
        await levelData.createIndex({ level: -1, totalExp: -1 });
        await levelData.createIndex({ level: -1 });
        await levelData.createIndex({ totalExp: -1 });
        await levelData.createIndex({ lastLevelUpTime: 1 });
    }

    /**
     * 邮件系统索引 (优化分页查询)
     */
    private static async createMailIndexes(db: any) {
        const mails = db.collection('mails');

        await mails.createIndex({ mailId: 1 }, { unique: true });
        await mails.createIndex({ userId: 1 });
        await mails.createIndex({ userId: 1, expiresAt: 1 });
        await mails.createIndex({ userId: 1, status: 1 });
        await mails.createIndex({ userId: 1, createdAt: -1 });  // 支持分页查询
        await mails.createIndex({ userId: 1, status: 1, createdAt: -1 });  // 组合索引：分页+过滤
        await mails.createIndex({ type: 1 });
        await mails.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });  // TTL索引：自动删除过期邮件
        await mails.createIndex({ status: 1 });
    }

    /**
     * VIP系统索引
     */
    private static async createVIPIndexes(db: any) {
        const vipData = db.collection('vip_data');

        await vipData.createIndex({ userId: 1 }, { unique: true });
        await vipData.createIndex({ vipLevel: -1 });
        await vipData.createIndex({ vipExpireAt: 1 });
        await vipData.createIndex({ totalRecharge: -1 });
        await vipData.createIndex({ lastRechargeTime: 1 });
    }

    /**
     * 赛季通行证索引
     */
    private static async createBattlePassIndexes(db: any) {
        const battlePass = db.collection('battle_pass');

        await battlePass.createIndex({ userId: 1, seasonId: 1 }, { unique: true });
        await battlePass.createIndex({ seasonId: 1 });
        await battlePass.createIndex({ userId: 1 });
        await battlePass.createIndex({ level: -1 });
        await battlePass.createIndex({ isPremium: 1 });
    }

    /**
     * 皮肤系统索引
     */
    private static async createSkinIndexes(db: any) {
        const userSkins = db.collection('user_skins');

        await userSkins.createIndex({ userId: 1 }, { unique: true });
        await userSkins.createIndex({ ownedSkins: 1 });
    }

    /**
     * 活动系统索引
     */
    private static async createEventIndexes(db: any) {
        const events = db.collection('events');
        const userEventProgress = db.collection('user_event_progress');

        // events集合索引
        await events.createIndex({ eventId: 1 }, { unique: true });
        await events.createIndex({ startTime: 1, endTime: 1 });
        await events.createIndex({ type: 1 });
        await events.createIndex({ endTime: 1 });

        // user_event_progress集合索引
        await userEventProgress.createIndex({ userId: 1, eventId: 1 }, { unique: true });
        await userEventProgress.createIndex({ userId: 1 });
        await userEventProgress.createIndex({ eventId: 1 });
    }

    /**
     * 用户系统索引 (优化管理后台查询)
     */
    private static async createUserIndexes(db: any) {
        const users = db.collection('users');

        await users.createIndex({ userId: 1 }, { unique: true });
        await users.createIndex({ username: 1 }, { unique: true });
        await users.createIndex({ lastLoginTime: -1 });  // 支持活跃用户查询
        await users.createIndex({ gold: -1 });  // 支持排行榜
        await users.createIndex({ createdAt: -1 });  // 支持注册时间排序
        await users.createIndex({ status: 1, lastLoginTime: -1 });  // 组合索引：状态+登录时间
        // 文本搜索索引（支持用户名/ID搜索）
        await users.createIndex(
            { userId: 'text', username: 'text' },
            { name: 'user_search_index' }
        );
    }

    /**
     * 管理员系统索引
     */
    private static async createAdminIndexes(db: any) {
        const adminUsers = db.collection('admin_users');
        const adminSessions = db.collection('admin_sessions');
        const adminLogs = db.collection('admin_logs');
        const auditLogs = db.collection('audit_logs');

        // admin_users集合索引
        await adminUsers.createIndex({ adminId: 1 }, { unique: true });
        await adminUsers.createIndex({ username: 1 }, { unique: true });
        await adminUsers.createIndex({ role: 1 });
        await adminUsers.createIndex({ createdAt: -1 });

        // admin_sessions集合索引
        await adminSessions.createIndex({ sessionId: 1 }, { unique: true });
        await adminSessions.createIndex({ adminId: 1 });
        await adminSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });  // TTL索引

        // admin_logs集合索引
        await adminLogs.createIndex({ adminId: 1, timestamp: -1 });
        await adminLogs.createIndex({ action: 1, timestamp: -1 });
        await adminLogs.createIndex({ timestamp: -1 });
        await adminLogs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 });  // 90天后删除

        // audit_logs集合索引（防篡改审计日志）
        await auditLogs.createIndex({ sequence: 1 }, { unique: true });
        await auditLogs.createIndex({ adminId: 1, timestamp: -1 });
        await auditLogs.createIndex({ action: 1, timestamp: -1 });
        await auditLogs.createIndex({ timestamp: -1 });
    }

    /**
     * 关闭数据库连接
     */
    static async close() {
        if (this.client) {
            await this.client.close();
            console.log('[InitIndexes] MongoDB connection closed');
        }
    }
}

/**
 * 独立运行脚本
 * 使用方式: npx ts-node src/server/gate/data/InitIndexes.ts
 */
if (require.main === module) {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const DB_NAME = process.env.DB_NAME || 'coin_pusher_game';

    (async () => {
        try {
            console.log('Starting index creation...');
            console.log(`MongoDB URL: ${MONGO_URL}`);
            console.log(`Database: ${DB_NAME}`);

            await InitIndexes.init(MONGO_URL, DB_NAME);
            await InitIndexes.createAllIndexes();
            await InitIndexes.close();

            console.log('✅ Index creation completed successfully!');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error creating indexes:', error);
            process.exit(1);
        }
    })();
}
