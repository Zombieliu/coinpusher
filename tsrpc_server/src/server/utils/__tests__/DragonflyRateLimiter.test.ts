/**
 * DragonflyDB限流器测试
 */

import Redis from 'ioredis';
import {
    DragonflyClientManager,
    SlidingWindowLimiter,
    TokenBucketLimiter,
    LeakyBucketLimiter
} from '../DragonflyRateLimiter';

describe('DragonflyDB Rate Limiters', () => {
    let client: Redis;

    beforeAll(async () => {
        // 连接到本地DragonflyDB（或Redis）
        client = DragonflyClientManager.initialize({
            host: process.env.DRAGONFLY_HOST || 'localhost',
            port: parseInt(process.env.DRAGONFLY_PORT || '6379', 10),
        });

        // 等待连接
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterAll(async () => {
        await DragonflyClientManager.disconnect();
    });

    beforeEach(async () => {
        // 清理测试数据
        await client.flushdb();
    });

    describe('SlidingWindowLimiter', () => {
        it('should allow requests within limit', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test_sliding', 5, 1000);

            // 前5个请求应该通过
            for (let i = 0; i < 5; i++) {
                const result = await limiter.tryAcquire('user1');
                expect(result.allowed).toBe(true);
                expect(result.current).toBe(i + 1);
                expect(result.remaining).toBe(4 - i);
            }

            // 第6个请求应该被拒绝
            const result = await limiter.tryAcquire('user1');
            expect(result.allowed).toBe(false);
            expect(result.current).toBe(5);
            expect(result.remaining).toBe(0);
            expect(result.retryAfter).toBeGreaterThan(0);
        });

        it('should allow new requests after window expires', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test_sliding_expire', 2, 500);

            // 用尽配额
            await limiter.tryAcquire('user2');
            await limiter.tryAcquire('user2');

            let result = await limiter.tryAcquire('user2');
            expect(result.allowed).toBe(false);

            // 等待窗口过期
            await new Promise(resolve => setTimeout(resolve, 600));

            // 现在应该允许
            result = await limiter.tryAcquire('user2');
            expect(result.allowed).toBe(true);
        });

        it('should handle different users independently', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test_sliding_multi', 3, 1000);

            // 用户1用尽配额
            await limiter.tryAcquire('user_a');
            await limiter.tryAcquire('user_a');
            await limiter.tryAcquire('user_a');

            const resultA = await limiter.tryAcquire('user_a');
            expect(resultA.allowed).toBe(false);

            // 用户2不受影响
            const resultB = await limiter.tryAcquire('user_b');
            expect(resultB.allowed).toBe(true);
        });

        it('should peek without consuming quota', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test_peek', 3, 1000);

            await limiter.tryAcquire('user3');

            const peek1 = await limiter.peek('user3');
            const peek2 = await limiter.peek('user3');

            expect(peek1.current).toBe(1);
            expect(peek2.current).toBe(1); // 没有增加
        });

        it('should reset quota', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test_reset', 2, 1000);

            await limiter.tryAcquire('user4');
            await limiter.tryAcquire('user4');

            let result = await limiter.tryAcquire('user4');
            expect(result.allowed).toBe(false);

            // 重置
            await limiter.reset('user4');

            result = await limiter.tryAcquire('user4');
            expect(result.allowed).toBe(true);
        });
    });

    describe('TokenBucketLimiter', () => {
        it('should allow burst traffic', async () => {
            const limiter = new TokenBucketLimiter(client, 'test_bucket', 10, 2, 1000);

            // 初始有10个token，可以立即消费
            for (let i = 0; i < 10; i++) {
                const result = await limiter.tryAcquire('user1');
                expect(result.allowed).toBe(true);
            }

            // 第11个应该被拒绝
            const result = await limiter.tryAcquire('user1');
            expect(result.allowed).toBe(false);
        });

        it('should refill tokens over time', async () => {
            const limiter = new TokenBucketLimiter(client, 'test_refill', 5, 5, 1000);

            // 用尽token
            for (let i = 0; i < 5; i++) {
                await limiter.tryAcquire('user2');
            }

            let result = await limiter.tryAcquire('user2');
            expect(result.allowed).toBe(false);

            // 等待1秒，应该补充5个token
            await new Promise(resolve => setTimeout(resolve, 1100));

            result = await limiter.tryAcquire('user2');
            expect(result.allowed).toBe(true);
        });

        it('should allow custom cost', async () => {
            const limiter = new TokenBucketLimiter(client, 'test_cost', 10, 1, 1000);

            // 消费5个token
            const result = await limiter.tryAcquire('user3', 5);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(5);

            // 再消费6个，应该失败（只剩5个）
            const result2 = await limiter.tryAcquire('user3', 6);
            expect(result2.allowed).toBe(false);
        });
    });

    describe('LeakyBucketLimiter', () => {
        it('should enforce constant rate', async () => {
            const limiter = new LeakyBucketLimiter(client, 'test_leaky', 5, 2);

            // 快速填充桶
            for (let i = 0; i < 5; i++) {
                const result = await limiter.tryAcquire('user1');
                expect(result.allowed).toBe(true);
            }

            // 桶满，拒绝
            const result = await limiter.tryAcquire('user1');
            expect(result.allowed).toBe(false);
        });

        it('should leak at constant rate', async () => {
            const limiter = new LeakyBucketLimiter(client, 'test_leak_rate', 3, 5);

            // 填满桶
            await limiter.tryAcquire('user2');
            await limiter.tryAcquire('user2');
            await limiter.tryAcquire('user2');

            let result = await limiter.tryAcquire('user2');
            expect(result.allowed).toBe(false);

            // 等待1秒，应该漏出5个请求的空间
            await new Promise(resolve => setTimeout(resolve, 1100));

            // 现在应该可以再次请求
            result = await limiter.tryAcquire('user2');
            expect(result.allowed).toBe(true);
        });
    });

    describe('DragonflyClientManager', () => {
        it('should connect to DragonflyDB', async () => {
            const health = await DragonflyClientManager.healthCheck();
            expect(health.connected).toBe(true);
            expect(health.latency).toBeDefined();
            expect(health.latency!).toBeLessThan(100); // < 100ms
        });

        it('should handle ping/pong', async () => {
            const result = await client.ping();
            expect(result).toBe('PONG');
        });
    });

    describe('Performance', () => {
        it('should handle high concurrency', async () => {
            const limiter = new SlidingWindowLimiter(client, 'test_perf', 100, 1000);

            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(limiter.tryAcquire(`user${i % 10}`));
            }

            const start = Date.now();
            await Promise.all(promises);
            const duration = Date.now() - start;

            console.log(`100 concurrent requests took ${duration}ms`);
            expect(duration).toBeLessThan(1000); // < 1秒
        });
    });
});
