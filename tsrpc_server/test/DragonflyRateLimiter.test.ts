import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import {
    DragonflyClientManager,
    SlidingWindowLimiter,
    TokenBucketLimiter,
    LeakyBucketLimiter
} from '../src/server/utils/DragonflyRateLimiter';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const benchConcurrency = Number(process.env.RATE_LIMIT_BENCH_CONCURRENCY || '1000');
const metricsFile = path.resolve(__dirname, '../test-results/dragonfly.json');

describe('DragonflyDB Rate Limiters', function () {
    // @ts-ignore: Mocha context
    this.timeout(30000);

    let client: any;

    before(async () => {
        if (process.env.SKIP_EXTERNAL === '1') {
            // 跳过外部依赖
            // @ts-ignore
            return this.skip();
        }

        const host = process.env.DRAGONFLY_HOST || 'localhost';
        const port = parseInt(process.env.DRAGONFLY_PORT || '6379', 10);

        // 初始化 DragonflyDB 连接
        client = DragonflyClientManager.initialize({ host, port });

        // 等待连接就绪
        await sleep(100);

        // 健康检查
        const health = await DragonflyClientManager.healthCheck().catch(() => ({ connected: false }));
        if (!health.connected) {
            // @ts-ignore
            this.skip();
            return;
        }
        assert.ok(health.connected, 'DragonflyDB should be connected');
        console.log(`    ✅ Connected to DragonflyDB (latency: ${health.latency}ms, version: ${health.version})`);
    });

    after(async () => {
        // 先清理，再断开，避免断开后 flushdb 抛 "Connection is closed"
        if (client) {
            try {
                await client.flushdb();
            } catch (err) {
                console.warn('⚠️  flushdb skipped:', (err as Error).message);
            }
        }
        await DragonflyClientManager.disconnect();
    });

    beforeEach(async () => {
        // 每个测试前清空数据库
        await client.flushdb();
    });

    describe('SlidingWindowLimiter', () => {
        it('should allow requests within limit', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test', 5, 1000);

            for (let i = 0; i < 5; i++) {
                const result = await limiter.tryAcquire('user1');
                assert.strictEqual(result.allowed, true, `Request ${i + 1} should be allowed`);
                assert.strictEqual(result.current, i + 1);
                assert.strictEqual(result.limit, 5);
            }
        });

        it('should deny requests over limit', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test', 5, 1000);

            // 消耗所有配额
            for (let i = 0; i < 5; i++) {
                await limiter.tryAcquire('user1');
            }

            // 第6个请求应该被拒绝
            const result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, false, 'Request over limit should be denied');
            assert.strictEqual(result.current, 5);
            assert.strictEqual(result.remaining, 0);
        });

        it('should reset after window expires', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test', 5, 500); // 500ms 窗口

            // 消耗所有配额
            for (let i = 0; i < 5; i++) {
                await limiter.tryAcquire('user1');
            }

            // 应该被拒绝
            let result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, false);

            // 等待窗口过期
            await sleep(600);

            // 应该可以再次请求
            result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, true, 'Request should be allowed after window reset');
        });

        it('should handle multiple users independently', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test', 3, 1000);

            // User1 消耗所有配额
            for (let i = 0; i < 3; i++) {
                await limiter.tryAcquire('user1');
            }

            // User2 应该仍然可以请求
            const result = await limiter.tryAcquire('user2');
            assert.strictEqual(result.allowed, true, 'Different user should have independent quota');
        });
    });

    describe('TokenBucketLimiter', () => {
        it('should allow burst traffic', async () => {
            const limiter = new TokenBucketLimiter(client, 'burst', 10, 1);

            // 应该可以立即使用所有令牌
            for (let i = 0; i < 10; i++) {
                const result = await limiter.tryAcquire('user1');
                assert.strictEqual(result.allowed, true, `Burst request ${i + 1} should be allowed`);
            }

            // 第11个请求应该被拒绝
            const result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, false, 'Request over bucket capacity should be denied');
        });

        it('should refill tokens over time', async () => {
            const limiter = new TokenBucketLimiter(client, 'refill', 5, 2); // 每秒补充2个令牌

            // 消耗所有令牌
            for (let i = 0; i < 5; i++) {
                await limiter.tryAcquire('user1');
            }

            // 应该被拒绝
            let result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, false);

            // 等待1秒，应该补充2个令牌
            await sleep(1100);

            // 应该可以请求2次
            result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, true, 'Should allow request after token refill');

            result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, true, 'Should allow second request');

            // 第3个应该被拒绝
            result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, false, 'Should deny request after tokens exhausted');
        });
    });

    describe('LeakyBucketLimiter', () => {
        it('should enforce constant rate', async () => {
            const limiter = new LeakyBucketLimiter(client, 'leak', 5, 10); // 10req/s，容量5

            // 快速发送5个请求（填满桶）
            for (let i = 0; i < 5; i++) {
                const result = await limiter.tryAcquire('user1');
                assert.strictEqual(result.allowed, true, `Request ${i + 1} should be allowed`);
            }

            // 第6个请求应该被拒绝（桶已满）
            const result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, false, 'Request should be denied when bucket is full');
        });

        it('should leak requests at constant rate', async () => {
            const limiter = new LeakyBucketLimiter(client, 'leak2', 3, 5); // 5req/s

            // 填满桶
            for (let i = 0; i < 3; i++) {
                await limiter.tryAcquire('user1');
            }

            // 应该被拒绝
            let result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, false);

            // 等待足够的时间让一些请求泄露（200ms = 1个请求泄露）
            await sleep(250);

            // 应该可以再次请求
            result = await limiter.tryAcquire('user1');
            assert.strictEqual(result.allowed, true, 'Should allow request after bucket leaks');
        });
    });

    describe('Performance', () => {
        it('should handle high concurrency', async () => {
            const limiter = new SlidingWindowLimiter(client, 'perf', 10000, 60000);
            const concurrency = benchConcurrency;

            const start = Date.now();
            const promises = [];

            for (let i = 0; i < concurrency; i++) {
                promises.push(limiter.tryAcquire(`user${i % 10}`));
            }

            await Promise.all(promises);
            const duration = Date.now() - start;

            console.log(`    ⚡ ${concurrency} concurrent requests: ${duration}ms`);
            console.log(`    📊 Throughput: ${(concurrency / (duration / 1000)).toFixed(0)} req/s`);

            const maxDuration = Math.max(2000, Math.ceil(concurrency * 2)); // 简单动态上限
            // 并发请求应在可接受时间内完成
            assert.ok(duration < maxDuration, `Performance should be < ${maxDuration}ms (actual: ${duration}ms)`);

            // 写入部分指标，低延迟测试里补全 percentiles
            fs.mkdirSync(path.dirname(metricsFile), { recursive: true });
            fs.writeFileSync(
                metricsFile,
                JSON.stringify({ concurrency, durationMs: duration, throughput: concurrency / (duration / 1000) }, null, 2)
            );
        });

        it('should have low latency', async () => {
            const limiter = new SlidingWindowLimiter(client, 'latency', 1000, 60000);
            const iterations = 100;
            const latencies: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const start = Date.now();
                await limiter.tryAcquire('user1');
                latencies.push(Date.now() - start);
            }

            latencies.sort((a, b) => a - b);
            const p50 = latencies[Math.floor(iterations * 0.5)];
            const p95 = latencies[Math.floor(iterations * 0.95)];
            const p99 = latencies[Math.floor(iterations * 0.99)];

            console.log(`    ⚡ P50 latency: ${p50}ms`);
            console.log(`    ⚡ P95 latency: ${p95}ms`);
            console.log(`    ⚡ P99 latency: ${p99}ms`);

            // P95应该小于10ms
            assert.ok(p95 < 10, `P95 latency should be < 10ms (actual: ${p95}ms)`);

            // 追加并持久化指标
            try {
                const base = fs.existsSync(metricsFile) ? JSON.parse(fs.readFileSync(metricsFile, 'utf-8')) : {};
                fs.writeFileSync(
                    metricsFile,
                    JSON.stringify(
                        {
                            ...base,
                            p50,
                            p95,
                            p99
                        },
                        null,
                        2
                    )
                );
            } catch (err) {
                console.warn('⚠️  Failed to write dragonfly metrics file', err);
            }
        });
    });

    describe('Health Check', () => {
        it('should report healthy connection', async () => {
            const health = await DragonflyClientManager.healthCheck();

            assert.strictEqual(health.connected, true);
            assert.ok(health.latency !== undefined && health.latency >= 0);
            assert.ok(health.version !== undefined);

            console.log(`    🔍 Health: connected=${health.connected}, latency=${health.latency}ms, version=${health.version}`);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid parameters gracefully', async () => {
            const limiter = new SlidingWindowLimiter(client, 'error', 0, 1000); // 无效的限制

            const result = await limiter.tryAcquire('user1');
            // 应该拒绝所有请求
            assert.strictEqual(result.allowed, false);
        });
    });
});
