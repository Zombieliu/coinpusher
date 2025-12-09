/**
 * 简单创建管理员账号
 */
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

async function main() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        const db = client.db('coinpusher_game');
        const collection = db.collection('admin_users');

        // 检查是否已存在
        const existing = await collection.findOne({ username: 'admin' });
        if (existing) {
            console.log('⚠️  admin用户已存在，正在更新密码...');
        }

        const password = 'admin123';
        const passwordHash = crypto
            .createHash('sha256')
            .update(password + 'coinpusher_admin_salt')
            .digest('hex');

        const adminUser = {
            adminId: 'admin_001',
            username: 'admin',
            passwordHash,
            role: 'super_admin',  // Must match AdminRole.SuperAdmin enum value
            permissions: ['*'],
            email: 'admin@example.com',
            status: 'active',
            createdAt: Date.now(),
            lastLoginAt: Date.now()
        };

        await collection.updateOne(
            { username: 'admin' },
            { $set: adminUser },
            { upsert: true }
        );

        console.log('✅ 管理员账号已就绪！');
        console.log('   用户名: admin');
        console.log('   密码: admin123');
        console.log('   角色: super_admin (SuperAdmin)');
    } catch (error) {
        console.error('错误:', error);
    } finally {
        await client.close();
    }
}

main();
