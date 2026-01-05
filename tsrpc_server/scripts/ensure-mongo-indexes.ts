/**
 * 创建/校验核心集合索引：
 * - friend_requests
 * - user_social
 * - user_tasks
 * - user_checkins
 * - user_achievements
 *
 * 运行方式：
 *   cd tsrpc_server
 *   npx ts-node scripts/ensure-mongo-indexes.ts
 *
 * 环境：
 *   MONGO_URI (或 .env 中 Config.mongodb)
 *   DB_NAME   (默认 coinpusher_game)
 */

import { MongoDBService } from '../src/server/gate/db/MongoDBService';
import { Config } from '../src/module/config/Config';

async function main() {
    const mongoUri = process.env.MONGO_URI || `mongodb://${Config.mongodb}/`;
    const dbName = process.env.DB_NAME || 'coinpusher_game';
    await MongoDBService.connect(mongoUri, dbName);

    const db = MongoDBService.getDb();

    const tasks = [
        {
            name: 'friend_requests',
            indexes: [
                { key: { requestId: 1 }, unique: true },
                { key: { toUserId: 1, status: 1 } },
                { key: { fromUserId: 1, status: 1 } }
            ]
        },
        {
            name: 'user_social',
            indexes: [{ key: { userId: 1 }, unique: true }]
        },
        {
            name: 'user_tasks',
            indexes: [{ key: { userId: 1, taskType: 1, taskId: 1 }, unique: true }]
        },
        {
            name: 'user_checkins',
            indexes: [{ key: { userId: 1 }, unique: true }]
        },
        {
            name: 'user_achievements',
            indexes: [{ key: { userId: 1, achievementId: 1 }, unique: true }]
        }
    ];

    for (const task of tasks) {
        const col = db.collection(task.name);
        for (const idx of task.indexes) {
            await col.createIndex(idx.key, { unique: idx.unique, background: true });
        }
        console.log(`[indexes] ${task.name} done`);
    }

    await MongoDBService.disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
