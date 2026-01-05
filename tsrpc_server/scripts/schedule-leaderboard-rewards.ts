/**
 * 创建排行榜发奖的定时任务
 *
 * 用法：
 *   npx ts-node scripts/schedule-leaderboard-rewards.ts
 * 环境变量：
 *   DRAGONFLY_URL / MONGO_URI / DB_NAME 与服务保持一致
 *   CRON_MODE=weekly 创建周榜任务；默认 daily
 *   RUN_AT=<timestamp_ms> 自定义执行时间（默认次日 00:05）
 *   TOP_N=<number> 发奖人数，默认 100
 */

import { MongoDBService } from '../src/server/gate/db/MongoDBService';
import { Config } from '../src/module/config/Config';
import { ScheduledJobSystem } from '../src/server/gate/bll/ScheduledJobSystem';
import { LeaderboardType, LeaderboardCategory } from '../src/server/gate/bll/LeaderboardSystemV2';

async function main() {
    const mongoUri = process.env.MONGO_URI || `mongodb://${Config.mongodb}/`;
    const dbName = process.env.DB_NAME || 'coinpusher_game';
    await MongoDBService.connect(mongoUri, dbName);

    const mode = (process.env.CRON_MODE || 'daily').toLowerCase(); // daily | weekly
    const topN = Number(process.env.TOP_N || '100');
    const runAtEnv = process.env.RUN_AT ? Number(process.env.RUN_AT) : undefined;

    // 默认执行时间：次日 00:05
    const now = new Date();
    const target = runAtEnv
        ? new Date(runAtEnv)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0, 0);

    const type = mode === 'weekly' ? LeaderboardType.Weekly : LeaderboardType.Daily;
    const categories = Object.values(LeaderboardCategory);

    for (const category of categories) {
        const jobId = await ScheduledJobSystem.schedule({
            type: 'leaderboard_reward' as any,
            runAt: target.getTime(),
            payload: { type, category, topN },
            note: `${type} ${category} rewards`,
            createdBy: 'scheduler_script'
        });
        console.log(`✔️  Scheduled ${type}/${category} rewards at ${target.toISOString()} (jobId=${jobId})`);
    }

    await MongoDBService.disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
