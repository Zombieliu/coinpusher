/**
 * 快速创建管理员账号脚本
 */

import { MongoClient } from 'mongodb';
import { getMongoDbName, getMongoUri, prettyPrintEnv } from './test-env.ts';

// bcrypt hash for 'admin123'
const ADMIN_PASSWORD_HASH = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa';

async function createAdmin() {
    console.log('🔧 创建管理员账号...\n');

    let client: MongoClient | null = null;

    try {
        // 连接MongoDB
        console.log(`📡 连接MongoDB: ${getMongoUri()}`);
        client = new MongoClient(getMongoUri());
        await client.connect();
        console.log('✅ MongoDB连接成功\n');
        prettyPrintEnv();

        const db = client.db(getMongoDbName());
        const adminUsersCollection = db.collection('admin_users');

        // 检查是否已存在admin用户
        const existing = await adminUsersCollection.findOne({ username: 'admin' });
        if (existing) {
            console.log('⚠️  管理员账号已存在！');
            console.log(`   用户名: ${existing.username}`);
            console.log(`   角色: ${existing.role}`);
            console.log(`   状态: ${existing.status}`);
            console.log(`   创建时间: ${new Date(existing.createdAt).toLocaleString('zh-CN')}\n`);

            const answer = await askQuestion('是否删除并重新创建? (y/N): ');
            if (answer.toLowerCase() !== 'y') {
                console.log('取消操作');
                return;
            }

            await adminUsersCollection.deleteOne({ username: 'admin' });
            console.log('✅ 已删除旧账号\n');
        }

        // 创建管理员账号
        console.log('📝 创建新的管理员账号...');

        const adminUser = {
            adminId: `admin_${Date.now()}`,
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
            lastLoginAt: null
        };

        await adminUsersCollection.insertOne(adminUser);
        console.log('✅ 管理员账号创建成功！\n');

        // 创建索引
        console.log('📋 创建数据库索引...');
        await adminUsersCollection.createIndex({ username: 1 }, { unique: true });
        await adminUsersCollection.createIndex({ adminId: 1 }, { unique: true });

        const sessionsCollection = db.collection('admin_sessions');
        await sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

        console.log('✅ 索引创建成功\n');

        // 显示登录信息
        console.log('='.repeat(60));
        console.log('🎉 管理员账号创建完成！');
        console.log('='.repeat(60));
        console.log('📋 登录信息:');
        console.log(`   用户名: admin`);
        console.log(`   密码: admin123`);
        console.log(`   角色: SuperAdmin (拥有所有权限)`);
        console.log('='.repeat(60));
        console.log('\n🚀 现在你可以启动管理后台了:');
        console.log('   1. docker compose up -d (或 npm run dev:gate)');
        console.log('   2. 管理后台: http://localhost:3003');
        console.log('   3. Gate HTTPS: https://localhost:32000\n');

    } catch (error: any) {
        console.error('❌ 创建管理员失败:', error.message);
        throw error;
    } finally {
        if (client) {
            await client.close();
            console.log('📡 MongoDB连接已关闭');
        }
    }
}

// 简单的命令行输入函数
function askQuestion(query: string): Promise<string> {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, (ans: string) => {
        rl.close();
        resolve(ans);
    }));
}

// 运行
if (require.main === module) {
    createAdmin()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('执行失败:', error);
            process.exit(1);
        });
}

export { createAdmin };
