import { MongoClient, ObjectId } from 'mongodb';
import { getMongoUri, getMongoDbName, prettyPrintEnv } from './test-env';

const SEED_TAG = 'admin-demo-seed';
const ADMIN_PASSWORD_HASH = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'; // admin123

async function seed() {
    const client = new MongoClient(getMongoUri());

    try {
        await client.connect();
        prettyPrintEnv();
        const db = client.db(getMongoDbName());

        await seedAdminUser(db);
        await seedUsers(db);
        await seedOrders(db);
        await seedSessions(db);
        await seedAdminLogs(db);
        await seedTickets(db);

        console.log('\n✅ 演示数据已准备就绪，可以直接登录管理后台查看图表、日志和工单。');
    } finally {
        await client.close();
    }
}

async function seedAdminUser(db: any) {
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
    console.log('• 管理员账号就绪 (admin / admin123)');
}

async function seedUsers(db: any) {
    const users = db.collection('users');
    const now = Date.now();
    const demoUsers = [
        {
            userId: 'demo_user_1',
            username: 'DemoAlice',
            level: 25,
            gold: 52000,
            createdAt: now - 7 * 24 * 3600 * 1000,
            lastLoginTime: now - 10 * 60 * 1000
        },
        {
            userId: 'demo_user_2',
            username: 'DemoBob',
            level: 18,
            gold: 12000,
            createdAt: now - 2 * 24 * 3600 * 1000,
            lastLoginTime: now - 30 * 60 * 1000
        },
        {
            userId: 'demo_user_3',
            username: 'DemoChris',
            level: 9,
            gold: 8000,
            createdAt: now - 12 * 3600 * 1000,
            lastLoginTime: now - 5 * 60 * 1000
        }
    ];

    for (const demo of demoUsers) {
        await users.updateOne(
            { userId: demo.userId },
            { $set: { ...demo, seedTag: SEED_TAG } },
            { upsert: true }
        );
    }
    console.log(`• 用户样本：${demoUsers.length} 条`);
}

async function seedOrders(db: any) {
    const orders = db.collection('payment_orders');
    await orders.deleteMany({ seedTag: SEED_TAG });

    const now = Date.now();
    const docs = [
        {
            _id: new ObjectId(),
            orderId: 'demo_order_1',
            userId: 'demo_user_1',
            status: 'paid',
            amount: 49.9,
            paidAt: now - 2 * 3600 * 1000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            orderId: 'demo_order_2',
            userId: 'demo_user_2',
            status: 'paid',
            amount: 9.9,
            paidAt: now - 26 * 3600 * 1000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            orderId: 'demo_order_3',
            userId: 'demo_user_3',
            status: 'pending',
            amount: 19.9,
            seedTag: SEED_TAG
        }
    ];

    if (docs.length) {
        await orders.insertMany(docs);
    }
    console.log(`• 订单样本：${docs.length} 条`);
}

async function seedSessions(db: any) {
    const sessions = db.collection('sessions');
    await sessions.deleteMany({ seedTag: SEED_TAG });

    const now = Date.now();
    await sessions.insertMany([
        {
            _id: new ObjectId(),
            userId: 'demo_user_1',
            lastActiveAt: now - 60 * 1000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            userId: 'demo_user_3',
            lastActiveAt: now - 2 * 60 * 1000,
            seedTag: SEED_TAG
        }
    ]);
    console.log('• 在线 session 样本已写入');
}

async function seedAdminLogs(db: any) {
    const adminLogs = db.collection('admin_logs');
    await adminLogs.deleteMany({ seedTag: SEED_TAG });

    const now = Date.now();
    const entries = [
        {
            _id: new ObjectId(),
            action: 'USER_BAN',
            adminId: 'admin_default',
            userId: 'demo_user_3',
            reason: '多次违规',
            timestamp: now - 15 * 60 * 1000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            action: 'REWARD_GRANT',
            adminId: 'admin_default',
            userId: 'demo_user_2',
            rewards: [{ gold: 5000 }],
            timestamp: now - 40 * 60 * 1000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            action: 'CONFIG_UPDATE',
            adminId: 'admin_default',
            target: 'maintenance',
            timestamp: now - 3 * 3600 * 1000,
            seedTag: SEED_TAG
        }
    ];

    await adminLogs.insertMany(entries);
    console.log(`• 审计日志样本：${entries.length} 条`);
}

async function seedTickets(db: any) {
    const tickets = db.collection('support_tickets');
    await tickets.deleteMany({ seedTag: SEED_TAG });

    const now = Date.now();
    const docs = [
        {
            _id: new ObjectId(),
            ticketId: 'demo_ticket_1',
            userId: 'demo_user_2',
            type: 'payment',
            status: 'open',
            subject: '充值未到账',
            messages: [
                {
                    sender: 'user',
                    senderId: 'demo_user_2',
                    senderName: 'DemoBob',
                    content: '昨天充值19.9没有到账，请协助处理',
                    timestamp: now - 2 * 3600 * 1000
                }
            ],
            createdAt: now - 2 * 3600 * 1000,
            updatedAt: now - 2 * 3600 * 1000,
            seedTag: SEED_TAG
        },
        {
            _id: new ObjectId(),
            ticketId: 'demo_ticket_2',
            userId: 'demo_user_1',
            type: 'bug',
            status: 'replied',
            subject: '活动页面无法打开',
            messages: [
                {
                    sender: 'user',
                    senderId: 'demo_user_1',
                    senderName: 'DemoAlice',
                    content: '周末活动点进去白屏',
                    timestamp: now - 6 * 3600 * 1000
                },
                {
                    sender: 'admin',
                    senderId: 'admin_default',
                    senderName: 'admin',
                    content: '已修复，请重新尝试~',
                    timestamp: now - 5 * 3600 * 1000
                }
            ],
            createdAt: now - 6 * 3600 * 1000,
            updatedAt: now - 5 * 3600 * 1000,
            seedTag: SEED_TAG
        }
    ];

    await tickets.insertMany(docs);
    console.log(`• 工单样本：${docs.length} 条`);
}

seed().catch(err => {
    console.error('❌ 写入演示数据失败:', err);
    process.exitCode = 1;
});
