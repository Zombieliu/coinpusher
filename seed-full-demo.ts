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
        await seedInviteSystem(db);
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
        { orderId: 'order_1', userId: 'demo_user_1', status: 'paid', amount: 59.9, paidAt: now - 3 * 3600 * 1000, productId: 'gold_large', productName: '金币大袋', currency: 'CNY', channel: 'wechat', createdAt: now - 4 * 3600 * 1000 },
        { orderId: 'order_2', userId: 'demo_user_2', status: 'paid', amount: 19.9, paidAt: now - 26 * 3600 * 1000, productId: 'gold_small', productName: '金币小袋', currency: 'CNY', channel: 'alipay', createdAt: now - 27 * 3600 * 1000 },
        { orderId: 'order_3', userId: 'demo_user_3', status: 'paid', amount: 9.9, paidAt: now - 12 * 3600 * 1000, productId: 'gold_small', productName: '金币小袋', currency: 'USD', channel: 'paypal', createdAt: now - 14 * 3600 * 1000 },
        { orderId: 'order_4', userId: 'demo_user_4', status: 'pending', amount: 4.9, productId: 'gold_small', productName: '金币小袋', currency: 'CNY', channel: 'wechat', createdAt: now - 2 * 3600 * 1000 }
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
            status: 'open',
            type: 'payment',
            subject: '充值不到账',
            messages: [{
                sender: 'user',
                senderId: 'demo_user_2',
                senderName: 'Bob',
                content: '昨晚充值金币没到账，请核查。',
                timestamp: Date.now() - 600000
            }],
            createdAt: Date.now() - 600000,
            updatedAt: Date.now() - 600000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            ticketId: 'ticket_demo_02',
            userId: 'demo_user_3',
            status: 'progress',
            type: 'account',
            subject: '账号被封禁',
            messages: [{
                sender: 'user',
                senderId: 'demo_user_3',
                senderName: 'Celine',
                content: '为什么我被封禁？',
                timestamp: Date.now() - 300000
            }],
            createdAt: Date.now() - 300000,
            updatedAt: Date.now() - 120000,
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
            eventType: 'season',
            title: '圣诞连胜赛',
            description: '活动期间累积胜利可获得翻倍奖励。',
            startTime: Date.now() - 24 * 3600 * 1000,
            endTime: Date.now() + 24 * 3600 * 1000,
            rewards: { gold: 8000 },
            config: { multiplier: 2 },
            status: 'ongoing',
            createdAt: Date.now(),
            createdBy: 'system',
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            eventId: 'event_demo_2',
            eventType: 'challenge',
            title: '新手七日签到',
            description: '连续签到 7 天即可领取额外钻石奖励。',
            startTime: Date.now() - 2 * 24 * 3600 * 1000,
            endTime: Date.now() + 5 * 24 * 3600 * 1000,
            rewards: { diamond: 5 },
            config: { days: 7 },
            status: 'ongoing',
            createdAt: Date.now(),
            createdBy: 'system',
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

async function seedInviteSystem(db: any) {
    const inviteStats = db.collection('invite_stats');
    const inviteRelations = db.collection('invite_relations');
    const inviteConfigs = db.collection('invite_reward_configs');
    const inviteHistory = db.collection('invite_reward_config_history');

    await inviteStats.deleteMany({ seedTag: SEED_TAG });
    await inviteRelations.deleteMany({ seedTag: SEED_TAG });
    await inviteConfigs.deleteMany({ seedTag: SEED_TAG });
    await inviteHistory.deleteMany({ seedTag: SEED_TAG });

    const now = Date.now();
    const inviterStats = [
        {
            _id: new ObjectId(),
            userId: 'demo_user_1',
            totalInvites: 5,
            validInvites: 4,
            totalRewards: 650,
            inviteCode: 'INV-A1B2',
            inviteLink: 'https://game.demo/invite/INV-A1B2',
            updatedAt: now,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            userId: 'demo_user_2',
            totalInvites: 2,
            validInvites: 2,
            totalRewards: 260,
            inviteCode: 'INV-C3D4',
            inviteLink: 'https://game.demo/invite/INV-C3D4',
            updatedAt: now,
            seedTag: SEED_TAG
        }
    ];
    await inviteStats.insertMany(inviterStats);

    await inviteRelations.insertMany([
        {
            _id: new ObjectId(),
            inviterId: 'demo_user_1',
            inviteeId: 'demo_user_3',
            inviteCode: 'INV-A1B2',
            invitedAt: now - 4 * 24 * 3600 * 1000,
            rewardGiven: true,
            firstChargeRewardGiven: true,
            level10RewardGiven: true,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            inviterId: 'demo_user_1',
            inviteeId: 'demo_user_4',
            inviteCode: 'INV-A1B2',
            invitedAt: now - 2 * 24 * 3600 * 1000,
            rewardGiven: true,
            firstChargeRewardGiven: false,
            level10RewardGiven: false,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            inviterId: 'demo_user_2',
            inviteeId: 'demo_guest_1',
            inviteCode: 'INV-C3D4',
            invitedAt: now - 6 * 24 * 3600 * 1000,
            rewardGiven: true,
            firstChargeRewardGiven: true,
            level10RewardGiven: false,
            seedTag: SEED_TAG
        }
    ]);

    const rewardConfig = {
        version: 3,
        config: {
            registerReward: 8,
            registerRewardInviter: 8,
            firstChargeRate: 15,
            level10Reward: 60,
            level20Reward: 120,
            level30Reward: 200
        },
        status: 'active',
        reviewStatus: 'approved',
        updatedAt: now,
        updatedBy: { adminId: 'admin_default', username: '管理员' },
        reviewer: { adminId: 'admin_default', username: '管理员' },
        reviewedAt: now,
        comment: '演示环境默认奖励配置',
        seedTag: SEED_TAG
    };
    await inviteConfigs.insertOne(rewardConfig);
    await inviteHistory.insertMany([
        {
            _id: new ObjectId(),
            historyId: 'invite_hist_1',
            version: 2,
            config: {
                registerReward: 5,
                registerRewardInviter: 5,
                firstChargeRate: 10,
                level10Reward: 50,
                level20Reward: 100,
                level30Reward: 150
            },
            status: 'archived',
            reviewStatus: 'approved',
            updatedAt: now - 7 * 24 * 3600 * 1000,
            updatedBy: { adminId: 'admin_default', username: '管理员' },
            reviewer: { adminId: 'admin_default', username: '管理员' },
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            historyId: 'invite_hist_2',
            ...rewardConfig,
            createdAt: now
        }
    ]);

    console.log('• 邀请系统样本已写入');
}

async function seedCdks(db: any) {
    const cdks = db.collection('cdk_codes');
    const cdkUsage = db.collection('cdk_usage_logs');
    const cdkAdminLogs = db.collection('cdk_admin_logs');

    await cdks.deleteMany({ seedTag: SEED_TAG });
    await cdkUsage.deleteMany({ seedTag: SEED_TAG });
    await cdkAdminLogs.deleteMany({ seedTag: SEED_TAG });

    const now = Date.now();
    const batchId = 'batch_demo_reward';
    await cdks.insertMany([
        {
            _id: new ObjectId(),
            code: 'DEMO-SINGLE-001',
            batchId,
            type: 'single',
            name: '演示单码奖励',
            rewards: { gold: 5000 },
            usageLimit: 1,
            usageCount: 0,
            expireAt: now + 30 * 24 * 3600 * 1000,
            createdAt: now - 24 * 3600 * 1000,
            createdBy: 'admin_default',
            active: true,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            code: 'DEMO-UNIV-ALL',
            batchId: 'batch_demo_universal',
            type: 'universal',
            name: '演示通用礼包',
            rewards: { gold: 2000, tickets: 5 },
            usageLimit: 100,
            usageCount: 12,
            expireAt: now + 60 * 24 * 3600 * 1000,
            createdAt: now - 48 * 3600 * 1000,
            createdBy: 'admin_default',
            active: true,
            seedTag: SEED_TAG
        }
    ]);

    await cdkUsage.insertMany([
        {
            _id: new ObjectId(),
            code: 'DEMO-UNIV-ALL',
            batchId: 'batch_demo_universal',
            userId: 'demo_user_3',
            rewards: { gold: 2000, tickets: 5 },
            usedAt: now - 12 * 3600 * 1000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            code: 'DEMO-UNIV-ALL',
            batchId: 'batch_demo_universal',
            userId: 'demo_user_4',
            rewards: { gold: 2000 },
            usedAt: now - 6 * 3600 * 1000,
            seedTag: SEED_TAG
        }
    ]);

    await cdkAdminLogs.insertMany([
        {
            _id: new ObjectId(),
            actionId: 'cdk_log_1',
            action: 'generate',
            batchId,
            code: undefined,
            adminId: 'admin_default',
            adminName: '管理员',
            comment: '批量生成演示 CDK',
            payload: { count: 50, rewards: { gold: 5000 } },
            createdAt: now - 24 * 3600 * 1000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            actionId: 'cdk_log_2',
            action: 'disable_code',
            batchId,
            code: 'DEMO-SINGLE-001',
            adminId: 'admin_default',
            adminName: '管理员',
            comment: '演示禁用单个 CDK',
            payload: { reason: '测试' },
            createdAt: now - 6 * 3600 * 1000,
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
