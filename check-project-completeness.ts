import { MongoClient } from 'mongodb';
import { getMongoUri, getMongoDbName, prettyPrintEnv } from './test-env';

async function checkCompleteness() {
    const client = new MongoClient(getMongoUri());

    try {
        await client.connect();
        console.log('✓ 已连接到 MongoDB\n');
        prettyPrintEnv();

        const db = client.db(getMongoDbName());

        // 获取所有集合
        const collections = await db.listCollections().toArray();
        console.log('=== 数据库集合 ===');
        console.log(`总计: ${collections.length} 个集合\n`);

        const collectionNames = collections.map(c => c.name).sort();
        collectionNames.forEach((name, i) => {
            console.log(`${(i+1).toString().padStart(2, '0')}. ${name}`);
        });

        // 检查关键集合的数据
        console.log('\n=== 关键集合数据统计 ===');

        const keyCollections = [
            'users',
            'admin_users',
            'admin_sessions',
            'admin_logs',
            'lottery_configs',
            'tasks',
            'achievements',
            'items',
            'shop_products',
            'mail_templates',
            'guilds',
            'friends'
        ];

        for (const collName of keyCollections) {
            try {
                const count = await db.collection(collName).countDocuments();
                console.log(`${collName.padEnd(25, ' ')}: ${count} 条记录`);
            } catch (e) {
                console.log(`${collName.padEnd(25, ' ')}: ✗ 集合不存在`);
            }
        }

        // 检查索引
        console.log('\n=== 索引统计 ===');
        let totalIndexes = 0;
        for (const collName of collectionNames) {
            const indexes = await db.collection(collName).indexes();
            totalIndexes += indexes.length - 1; // 减去默认的 _id 索引
        }
        console.log(`总计索引数: ${totalIndexes} 个（不含 _id）`);

    } catch (error) {
        console.error('错误:', error);
    } finally {
        await client.close();
    }
}

checkCompleteness();
