import { BuffSystem } from './bll/BuffSystem';
import { MailSystem } from './bll/MailSystem';
import { InitIndexes } from './data/InitIndexes';

/**
 * 初始化所有系统
 */
export class InitSystems {
    /**
     * 初始化所有系统
     */
    static async initAll(mongoUrl: string, dbName: string) {
        console.log('[InitSystems] Starting system initialization...');

        try {
            // 1. 初始化数据库索引
            console.log('[InitSystems] Step 1/2: Creating database indexes...');
            await InitIndexes.init(mongoUrl, dbName);
            await InitIndexes.createAllIndexes();
            await InitIndexes.close();
            console.log('[InitSystems] ✅ Database indexes created');

            // 2. 启动定时任务
            console.log('[InitSystems] Step 2/3: Starting cleanup timers...');
            BuffSystem.startCleanupTimer();
            MailSystem.startCleanupTimer();
            console.log('[InitSystems] ✅ Cleanup timers started');

            console.log('[InitSystems] ✅ All systems initialized successfully!');
        } catch (error) {
            console.error('[InitSystems] ❌ Error initializing systems:', error);
            throw error;
        }
    }

    /**
     * 仅初始化运行时组件（不包括数据库索引创建）
     * 用于服务器启动时调用
     */
    static async initRuntime() {
        console.log('[InitSystems] Starting runtime initialization...');

        try {
            // 启动定时任务
            BuffSystem.startCleanupTimer();
            MailSystem.startCleanupTimer();
            console.log('[InitSystems] ✅ Cleanup timers started');

            console.log('[InitSystems] ✅ Runtime initialization completed!');
        } catch (error) {
            console.error('[InitSystems] ❌ Error in runtime initialization:', error);
            throw error;
        }
    }
}
