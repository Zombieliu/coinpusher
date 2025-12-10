import { MongoClient } from 'mongodb';
import { getMongoDbName, getMongoUri } from './test-env.ts';

const TAGS = ['full-demo-seed', 'admin-demo-seed'];

async function clear() {
    const client = new MongoClient(getMongoUri());
    try {
        await client.connect();
        const db = client.db(getMongoDbName());
        const collections = [
            'users',
            'payment_orders',
            'sessions',
            'admin_logs',
            'support_tickets',
            'tasks',
            'achievements',
            'shop_products',
            'user_items',
            'mails'
        ];
        for (const col of collections) {
            const result = await db.collection(col).deleteMany({ seedTag: { $in: TAGS } });
            console.log(`• ${col}: 清理 ${result.deletedCount} 条`);
        }
        console.log('✅ 演示数据已清理完成');
    } finally {
        await client.close();
    }
}

clear().catch(err => {
    console.error('❌ 清理失败:', err);
    process.exit(1);
});
