import { MongoClient, ObjectId } from 'mongodb';
import { getMongoDbName, getMongoUri, prettyPrintEnv } from './test-env.ts';

const SEED_TAG = 'full-demo-seed';
const ADMIN_PASSWORD_HASH = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'; // admin123

async function main() {
    const client = new MongoClient(getMongoUri());
    try {
        await client.connect();
        prettyPrintEnv();
        const db = client.db(getMongoDbName());

        await seedAdmin(db);
        await seedUsers(db);
        await seedOrders(db);
        await seedSessions(db);
        await seedAdminLogs(db);
        await seedTickets(db);
        await seedAnnouncements(db);
        await seedEvents(db);
        await seedTasks(db);
        await seedAchievements(db);
        await seedShopProducts(db);
        await seedInventory(db);
        await seedMails(db);
        await seedCdks(db);
        await seedNotificationStats(db);
        await seedLogAnalytics(db);

        console.log('\n✅ 完整演示数据已经注入，刷新管理后台即可查看。');
    } finally {
        await client.close();
    }
}

async function seedAdmin(db: any) {
    const adminUsers = db.collection('admin_users');
    await adminUsers.updateOne(
        { username: 'admin' },
        {
            $setOnInsert: {
                adminId: 'admin_default',
                username: 'admin',
                passwordHash: ADMIN_PASSWORD_HASH,
                role: 'SuperAdmin',
                permissions: [
                    'ViewDashboard',
                    'ViewUsers',
                    'BanUsers',
                    'SendMail',
                    'ManageEvents',
                    'ViewConfig',
                    'UpdateConfig',
                    'ViewLogs',
                    'GrantRewards',
                    'ManageAdmins',
                    'ViewReports',
                    'SystemSettings'
                ],
                status: 'active',
                createdAt: Date.now(),
                lastLoginAt: Date.now()
            }
        },
        { upsert: true }
    );
    console.log('• 管理员账号准备完成 (admin/admin123)');
}

async function seedUsers(db: any) {
    const users = db.collection('users');
    const now = Date.now();
    const docs = [
        {
            userId: 'demo_user_1',
            username: 'Alice',
            gold: 52000,
            level: 26,
            createdAt: now - 10 * 24 * 3600 * 1000,
            lastLoginTime: now - 5 * 60 * 1000
        },
        {
            userId: 'demo_user_2',
            username: 'Bob',
            gold: 13500,
            level: 18,
            createdAt: now - 5 * 24 * 3600 * 1000,
            lastLoginTime: now - 60 * 60 * 1000
        },
        {
            userId: 'demo_user_3',
            username: 'Celine',
            gold: 9800,
            level: 14,
            createdAt: now - 2 * 24 * 3600 * 1000,
            lastLoginTime: now - 15 * 60 * 1000
        },
        {
            userId: 'demo_user_4',
            username: 'Duke',
            gold: 3000,
            level: 6,
            createdAt: now - 6 * 3600 * 1000,
            lastLoginTime: now - 2 * 60 * 1000
        }
    ];

    for (const doc of docs) {
        await users.updateOne({ userId: doc.userId }, { $set: { ...doc, seedTag: SEED_TAG } }, { upsert: true });
    }
    console.log(`• 用户样本 ${docs.length} 条`);
}

async function seedOrders(db: any) {
    const orders = db.collection('payment_orders');
    await orders.deleteMany({ seedTag: SEED_TAG });
    const now = Date.now();
    const entries = [
        { orderId: 'order_1', userId: 'demo_user_1', status: 'paid', amount: 59.9, paidAt: now - 3 * 3600 * 1000 },
        { orderId: 'order_2', userId: 'demo_user_2', status: 'paid', amount: 19.9, paidAt: now - 26 * 3600 * 1000 },
        { orderId: 'order_3', userId: 'demo_user_3', status: 'paid', amount: 9.9, paidAt: now - 12 * 3600 * 1000 },
        { orderId: 'order_4', userId: 'demo_user_4', status: 'pending', amount: 4.9 }
    ].map(d => ({ _id: new ObjectId(), seedTag: SEED_TAG, ...d }));
    if (entries.length) {
        await orders.insertMany(entries);
    }
    console.log('• 订单样本已创建');
}

async function seedSessions(db: any) {
    const sessions = db.collection('sessions');
    await sessions.deleteMany({ seedTag: SEED_TAG });
    const now = Date.now();
    await sessions.insertMany([
        { _id: new ObjectId(), userId: 'demo_user_1', lastActiveAt: now - 30 * 1000, seedTag: SEED_TAG },
        { _id: new ObjectId(), userId: 'demo_user_2', lastActiveAt: now - 2 * 60 * 1000, seedTag: SEED_TAG }
    ]);
    console.log('• Session 样本已写入');
}

async function seedAdminLogs(db: any) {
    const logs = db.collection('admin_logs');
    await logs.deleteMany({ seedTag: SEED_TAG });
    const now = Date.now();
    await logs.insertMany([
        {
            _id: new ObjectId(),
            action: 'REWARD_GRANT',
            adminId: 'admin_default',
            userId: 'demo_user_2',
            rewards: [{ gold: 5000 }],
            timestamp: now - 20 * 60 * 1000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            action: 'USER_BAN',
            adminId: 'admin_default',
            userId: 'demo_user_4',
            reason: '违规聊天',
            timestamp: now - 2 * 3600 * 1000,
            seedTag: SEED_TAG
        }
    ]);
    console.log('• 审计日志样本完成');
}

async function seedTickets(db: any) {
    const tickets = db.collection('support_tickets');
    await tickets.deleteMany({ seedTag: SEED_TAG });
    await tickets.insertMany([
        {
            _id: new ObjectId(),
            ticketId: 'ticket_demo_01',
            userId: 'demo_user_2',
            status: 'pending',
            title: '充值不到账',
            messages: [{ role: 'user', content: '昨晚充值金币没到账，请核查。', createdAt: Date.now() - 600000 }],
            seedTag: SEED_TAG
        }
    ]);
    console.log('• 客服工单样本完成');
}

async function seedAnnouncements(db: any) {
    const announcements = db.collection('announcements');
    await announcements.deleteMany({ seedTag: SEED_TAG });
    await announcements.insertMany([
        {
            _id: new ObjectId(),
            announcementId: 'ann_demo_1',
            title: '版本更新通知',
            content: '推币机 3.7 版本上线，新增活动和奖励。',
            priority: 1,
            status: 'active',
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            announcementId: 'ann_demo_2',
            title: '临时维护',
            content: '本周五凌晨将进行维护，请提前安排。',
            priority: 2,
            status: 'scheduled',
            seedTag: SEED_TAG
        }
    ]);
    console.log('• 公告样本已写入');
}

async function seedEvents(db: any) {
    const events = db.collection('events');
    await events.deleteMany({ seedTag: SEED_TAG });
    await events.insertMany([
        {
            _id: new ObjectId(),
            eventId: 'event_demo_1',
            name: '圣诞连胜赛',
            startTime: Date.now() - 24 * 3600 * 1000,
            endTime: Date.now() + 24 * 3600 * 1000,
            rewards: [{ gold: 8000 }],
            status: 'ongoing',
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            eventId: 'event_demo_2',
            name: '新手七日签到',
            startTime: Date.now() - 2 * 24 * 3600 * 1000,
            endTime: Date.now() + 5 * 24 * 3600 * 1000,
            rewards: [{ diamond: 5 }],
            status: 'ongoing',
            seedTag: SEED_TAG
        }
    ]);
    console.log('• 活动样本已写入');
}

async function seedTasks(db: any) {
    const tasks = db.collection('tasks');
    await tasks.deleteMany({ seedTag: SEED_TAG });
    await tasks.insertMany([
        { _id: new ObjectId(), taskId: 'daily_login', title: '每日登录', reward: { gold: 200 }, seedTag: SEED_TAG },
        { _id: new ObjectId(), taskId: 'win_matches', title: '胜利3场', reward: { diamond: 5 }, seedTag: SEED_TAG }
    ]);
    console.log('• 任务配置样本已写入');
}

async function seedAchievements(db: any) {
    const achievements = db.collection('achievements');
    await achievements.deleteMany({ seedTag: SEED_TAG });
    await achievements.insertMany([
        { _id: new ObjectId(), achievementId: 'first_win', title: '初尝胜利', reward: { gold: 500 }, seedTag: SEED_TAG },
        { _id: new ObjectId(), achievementId: 'collector', title: '收藏达人', reward: { diamond: 10 }, seedTag: SEED_TAG }
    ]);
    console.log('• 成就配置样本已写入');
}

async function seedShopProducts(db: any) {
    const shop = db.collection('shop_products');
    await shop.deleteMany({ seedTag: SEED_TAG });
    await shop.insertMany([
        { _id: new ObjectId(), productId: 'gold_small', title: '金币小袋', price: 4.99, reward: { gold: 5000 }, seedTag: SEED_TAG },
        { _id: new ObjectId(), productId: 'gold_large', title: '金币大袋', price: 14.99, reward: { gold: 20000 }, seedTag: SEED_TAG }
    ]);
    console.log('• 商城商品样本已写入');
}

async function seedInventory(db: any) {
    const userItems = db.collection('user_items');
    await userItems.deleteMany({ seedTag: SEED_TAG });
    await userItems.insertMany([
        { _id: new ObjectId(), userId: 'demo_user_1', itemId: 'buff_double', amount: 2, seedTag: SEED_TAG },
        { _id: new ObjectId(), userId: 'demo_user_3', itemId: 'buff_speed', amount: 1, seedTag: SEED_TAG }
    ]);
    console.log('• 背包物品样本已写入');
}

async function seedMails(db: any) {
    const mails = db.collection('mails');
    await mails.deleteMany({ seedTag: SEED_TAG });
    await mails.insertMany([
        {
            _id: new ObjectId(),
            mailId: 'mail_demo_01',
            userId: 'demo_user_1',
            title: '欢迎来到推币世界',
            content: '感谢加入，送你一份小礼物！',
            rewards: [{ gold: 1000 }],
            status: 'unread',
            seedTag: SEED_TAG
        }
    ]);
    console.log('• 邮件样本已写入');
}

async function seedCdks(db: any) {
    const cdks = db.collection('cdk_codes');
    await cdks.deleteMany({ seedTag: SEED_TAG });
    await cdks.insertMany([
        {
            _id: new ObjectId(),
            code: 'DEMO-CODE-1234',
            type: 'single',
            rewards: [{ gold: 5000 }],
            status: 'active',
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            code: 'DEMO-CODE-ALL',
            type: 'global',
            rewards: [{ diamond: 20 }],
            status: 'active',
            seedTag: SEED_TAG
        }
    ]);
    console.log('• CDK 样本已写入');
}

async function seedNotificationStats(db: any) {
    const stats = db.collection('admin_notifications');
    await stats.deleteMany({ seedTag: SEED_TAG });
    await stats.insertMany([
        {
            _id: new ObjectId(),
            notificationId: 'notif_demo_1',
            type: 'system',
            title: '监控告警',
            content: '网关 5 分钟内出现 3 次错误，请检查。',
            createdAt: Date.now() - 10 * 60 * 1000,
            read: false,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            notificationId: 'notif_demo_2',
            type: 'finance',
            title: '大额充值提醒',
            content: '玩家 Alice 刚刚充值 199 元。',
            createdAt: Date.now() - 20 * 60 * 1000,
            read: true,
            seedTag: SEED_TAG
        }
    ]);
    console.log('• 通知样本已写入');
}

async function seedLogAnalytics(db: any) {
    const analytics = db.collection('admin_log_analytics');
    await analytics.deleteMany({ seedTag: SEED_TAG });
    await analytics.insertOne({
        _id: new ObjectId(),
        seedTag: SEED_TAG,
        rangeStart: Date.now() - 7 * 24 * 3600 * 1000,
        rangeEnd: Date.now(),
        actionStats: [
            { action: 'REWARD_GRANT', count: 5, percentage: 40 },
            { action: 'USER_BAN', count: 3, percentage: 24 },
            { action: 'CONFIG_UPDATE', count: 2, percentage: 16 },
            { action: 'MAIL_SEND', count: 3, percentage: 20 }
        ],
        adminStats: [
            { adminId: 'admin_default', adminName: '管理员', operationCount: 12, lastOperation: Date.now() - 600000 }
        ],
        timeDistribution: Array.from({ length: 24 }).map((_, hour) => ({
            hour,
            count: Math.floor(Math.random() * 5)
        })),
        dailyTrend: Array.from({ length: 7 }).map((_, idx) => ({
            date: new Date(Date.now() - idx * 24 * 3600 * 1000).toISOString().slice(0, 10),
            count: Math.floor(Math.random() * 8)
        }))
    });
    console.log('• 审计分析样本已写入');
}

main().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
