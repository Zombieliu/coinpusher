import { DragonflyClientManager, SlidingWindowLimiter } from '../utils/DragonflyRateLimiter';
import { performance } from 'perf_hooks';

describe('Performance Tests', () => {
    let client: any;

    beforeAll(async () => {
        client = DragonflyClientManager.initialize({
            host: 'localhost',
            port: 6379
        });
    });

    afterAll(async () => {
        await DragonflyClientManager.disconnect();
    });

    test('should handle 1000 requests in < 500ms', async () => {
        await client.flushdb();
        const limiter = new SlidingWindowLimiter(client, 'perf', 10000, 60000);

        const start = performance.now();
        const promises = [];

        for (let i = 0; i < 1000; i++) {
            promises.push(limiter.tryAcquire(`user${i % 10}`));
        }

        await Promise.all(promises);
        const duration = performance.now() - start;

        console.log(`    ⚡ 1000 requests: ${duration.toFixed(2)}ms`);
        expect(duration).toBeLessThan(500);
    });

    test('should have low latency', async () => {
        const limiter = new SlidingWindowLimiter(client, 'latency', 1000, 60000);
        const latencies: number[] = [];

        for (let i = 0; i < 100; i++) {
            const start = performance.now();
            await limiter.tryAcquire('user1');
            latencies.push(performance.now() - start);
        }

        latencies.sort((a, b) => a - b);
        const p95 = latencies[Math.floor(latencies.length * 0.95)];

        console.log(`    ⚡ P95 latency: ${p95.toFixed(2)}ms`);
        expect(p95).toBeLessThan(10);
    });
});
