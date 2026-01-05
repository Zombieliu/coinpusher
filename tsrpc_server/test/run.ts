// 环境准备（避免启动时报缺少关键密钥）
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.INTERNAL_SECRET_KEY = process.env.INTERNAL_SECRET_KEY || 'TEST_KEY_FOR_DEVELOPMENT_ONLY_DO_NOT_USE_IN_PRODUCTION_32_CHARS_MIN';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_1234567890abcdefghijklmnop';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Mocha from 'mocha';
import { DragonflyClientManager } from '../src/server/utils/DragonflyRateLimiter';
import { DragonflyDBService } from '../src/server/gate/db/DragonflyDBService';

// 简单递归收集 test 目录下的 *.test.ts 文件，避免 glob 依赖
function collectTests(dir: string, acc: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            collectTests(full, acc);
        } else if (ent.isFile() && ent.name.endsWith('.test.ts')) {
            acc.push(full);
        }
    }
    return acc;
}

const root = path.resolve(__dirname); // test directory
const keyword = process.argv.find(arg => arg.startsWith('--filter='))?.split('=')[1];
let files = collectTests(root);
if (keyword) {
    files = files.filter(f => f.includes(keyword));
}
const skipExternal = process.env.SKIP_EXTERNAL !== '0';
if (skipExternal) {
    const externals = ['DragonflyRateLimiter.test.ts', 'RustRoomClient.test.ts'];
    files = files.filter(f => !externals.some(ex => f.endsWith(ex)));
}

// 确保测试环境有内部签名密钥（防止因未设置直接抛错）
if (!process.env.INTERNAL_SECRET_KEY) {
    process.env.INTERNAL_SECRET_KEY = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  INTERNAL_SECRET_KEY not set, generated a temporary key for tests.');
}

const mocha = new Mocha({
    timeout: 20_000,
});

files.forEach(f => mocha.addFile(f));

mocha.run(async failures => {
    // 外部依赖测试跑完后，尽力清理 Dragonfly
    if (!skipExternal) {
        try {
            const url = process.env.DRAGONFLY_URL || 'redis://127.0.0.1:6379';
            const client = DragonflyClientManager.initialize({ url } as any);
            await client.flushdb();
            await DragonflyDBService.disconnect().catch(() => {});
            await client.quit();
            console.log('Teardown: Dragonfly flushed.');
        } catch (err) {
            console.warn('Teardown skipped (Dragonfly unavailable):', (err as Error).message);
        }
    }
    // 强制退出，避免外部客户端/Redis连接保持事件循环占用
    process.exit(failures ? 1 : 0);
});
