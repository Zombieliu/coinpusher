import { MongoClient } from 'mongodb';
import { getMongoDbName, getMongoUri, prettyPrintEnv } from './test-env.ts';

const SEED_TAG = 'full-demo-seed';

async function main() {
    const client = new MongoClient(getMongoUri());
    try {
        await client.connect();
        prettyPrintEnv();
        const db = client.db(getMongoDbName());
        await clearSeedData(db);
        console.log('\n✅ 演示数据已清理完成。');
    } finally {
        await client.close();
    }
}

async function clearSeedData(db: any) {
    const collections = [
        'users',
        'payment_orders',
        'sessions',
        'admin_logs',
        'support_tickets',
        'announcements',
        'events',
        'tasks',
        'achievements',
        'shop_products',
        'user_items',
        'mails',
        'refund_requests',
        'cdk_codes',
        'cdk_usage_logs',
        'cdk_admin_logs',
        'admin_notifications',
        'admin_log_analytics',
        'invite_stats',
        'invite_relations',
        'invite_reward_configs',
        'invite_reward_config_history'
    ];

    for (const name of collections) {
        const result = await db.collection(name).deleteMany({ seedTag: SEED_TAG });
        console.log(`• ${name} 清理 ${result.deletedCount || 0} 条`);
    }
}

main().catch(err => {
    console.error('❌ Clear seed failed:', err);
    process.exit(1);
});
