/**
 * 重置管理员密码
 */
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

async function main() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        const db = client.db('coinpusher_game');
        const collection = db.collection('admin_users');

        const password = 'admin123';
        const passwordHash = crypto
            .createHash('sha256')
            .update(password + 'coinpusher_admin_salt')
            .digest('hex');

        const result = await collection.updateOne(
            { username: 'admin' },
            {
                $set: {
                    passwordHash,
                    status: 'active'
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log('✅ 密码已重置');
            console.log('   用户名: admin');
            console.log('   密码: admin123');
            console.log('   密码哈希:', passwordHash);
        } else {
            console.log('❌ 未找到admin用户');
        }
    } catch (error) {
        console.error('错误:', error);
    } finally {
        await client.close();
    }
}

main();
