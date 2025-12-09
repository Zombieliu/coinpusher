import { DragonflyClientManager, SlidingWindowLimiter } from '../../utils/DragonflyRateLimiter';

describe('Quick Integration Test', () => {
    let client: any;
    let limiter: SlidingWindowLimiter;

    beforeAll(async () => {
        client = DragonflyClientManager.initialize({
            host: 'localhost',
            port: 6379
        });
        limiter = new SlidingWindowLimiter(client, 'test', 10, 1000);
    });

    afterAll(async () => {
        await DragonflyClientManager.disconnect();
    });

    test('should connect to DragonflyDB', async () => {
        const health = await DragonflyClientManager.healthCheck();
        expect(health.connected).toBe(true);
        expect(health.latency).toBeDefined();
    });

    test('should enforce rate limit', async () => {
        await client.flushdb();

        for (let i = 0; i < 10; i++) {
            const result = await limiter.tryAcquire('user1');
            expect(result.allowed).toBe(true);
        }

        const result = await limiter.tryAcquire('user1');
        expect(result.allowed).toBe(false);
    });
});
