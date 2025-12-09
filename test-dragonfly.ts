#!/usr/bin/env ts-node

/**
 * 🧪 DragonflyDB 限流器快速测试
 *
 * 独立测试脚本，不依赖 Mocha
 */

import {
    DragonflyClientManager,
    SlidingWindowLimiter,
    TokenBucketLimiter,
    LeakyBucketLimiter
} from './tsrpc_server/src/server/utils/DragonflyRateLimiter';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testSlidingWindow() {
    console.log('\n📊 Test 1: Sliding Window Limiter');
    console.log('═'.repeat(60));

    const client = DragonflyClientManager.getClient();
    await client.flushdb();

    const limiter = new SlidingWindowLimiter(client, 'test', 5, 1000);

    console.log('✓ Testing requests within limit...');
    for (let i = 0; i < 5; i++) {
        const result = await limiter.tryAcquire('user1');
        if (!result.allowed) {
            console.error(`✗ Request ${i + 1} should be allowed but was denied`);
            return false;
        }
    }
    console.log('  ✅ All 5 requests allowed');

    console.log('✓ Testing request over limit...');
    const result = await limiter.tryAcquire('user1');
    if (result.allowed) {
        console.error('✗ Request over limit should be denied');
        return false;
    }
    console.log('  ✅ 6th request correctly denied');

    console.log('✓ Testing window reset...');
    await sleep(1100); // Wait for window to expire
    const result2 = await limiter.tryAcquire('user1');
    if (!result2.allowed) {
        console.error('✗ Request should be allowed after window reset');
        return false;
    }
    console.log('  ✅ Request allowed after window reset');

    console.log('\n✅ Sliding Window Limiter: ALL TESTS PASSED\n');
    return true;
}

async function testTokenBucket() {
    console.log('\n📊 Test 2: Token Bucket Limiter');
    console.log('═'.repeat(60));

    const client = DragonflyClientManager.getClient();
    await client.flushdb();

    const limiter = new TokenBucketLimiter(client, 'bucket', 10, 2); // 容量10，每秒补充2个

    console.log('✓ Testing burst traffic (10 requests)...');
    for (let i = 0; i < 10; i++) {
        const result = await limiter.tryAcquire('user1');
        if (!result.allowed) {
            console.error(`✗ Burst request ${i + 1} should be allowed`);
            return false;
        }
    }
    console.log('  ✅ All 10 burst requests allowed');

    console.log('✓ Testing over capacity...');
    const result = await limiter.tryAcquire('user1');
    if (result.allowed) {
        console.error('✗ Request over capacity should be denied');
        return false;
    }
    console.log('  ✅ 11th request correctly denied');

    console.log('✓ Testing token refill (waiting 1s)...');
    await sleep(1100); // Wait for tokens to refill
    const result2 = await limiter.tryAcquire('user1');
    if (!result2.allowed) {
        console.error('✗ Request should be allowed after refill');
        return false;
    }
    console.log('  ✅ Request allowed after token refill');

    console.log('\n✅ Token Bucket Limiter: ALL TESTS PASSED\n');
    return true;
}

async function testLeakyBucket() {
    console.log('\n📊 Test 3: Leaky Bucket Limiter');
    console.log('═'.repeat(60));

    const client = DragonflyClientManager.getClient();
    await client.flushdb();

    const limiter = new LeakyBucketLimiter(client, 'leak', 5, 10); // 容量5，10req/s

    console.log('✓ Testing bucket fill (5 requests)...');
    for (let i = 0; i < 5; i++) {
        const result = await limiter.tryAcquire('user1');
        if (!result.allowed) {
            console.error(`✗ Request ${i + 1} should be allowed`);
            return false;
        }
    }
    console.log('  ✅ Bucket filled (5 requests)');

    console.log('✓ Testing full bucket...');
    const result = await limiter.tryAcquire('user1');
    if (result.allowed) {
        console.error('✗ Request should be denied when bucket is full');
        return false;
    }
    console.log('  ✅ Request correctly denied');

    console.log('✓ Testing leak (waiting 250ms)...');
    await sleep(250); // Wait for bucket to leak
    const result2 = await limiter.tryAcquire('user1');
    if (!result2.allowed) {
        console.error('✗ Request should be allowed after bucket leaks');
        return false;
    }
    console.log('  ✅ Request allowed after leak');

    console.log('\n✅ Leaky Bucket Limiter: ALL TESTS PASSED\n');
    return true;
}

async function testPerformance() {
    console.log('\n📊 Test 4: Performance Benchmark');
    console.log('═'.repeat(60));

    const client = DragonflyClientManager.getClient();
    await client.flushdb();

    const limiter = new SlidingWindowLimiter(client, 'perf', 10000, 60000);

    console.log('✓ Testing 1000 concurrent requests...');
    const start = Date.now();
    const promises = [];

    for (let i = 0; i < 1000; i++) {
        promises.push(limiter.tryAcquire(`user${i % 10}`));
    }

    await Promise.all(promises);
    const duration = Date.now() - start;

    console.log(`  ⚡ Duration: ${duration}ms`);
    console.log(`  📊 Throughput: ${(1000 / (duration / 1000)).toFixed(0)} req/s`);
    console.log(`  📈 Avg Latency: ${(duration / 1000).toFixed(2)}ms/req`);

    if (duration < 2000) {
        console.log('  ✅ Performance excellent (<2s)');
        return true;
    } else {
        console.error('  ✗ Performance too slow (>2s)');
        return false;
    }
}

async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║       🧪 DragonflyDB Rate Limiter Tests                 ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    try {
        // 连接 DragonflyDB
        console.log('\n🔧 Connecting to DragonflyDB...');
        DragonflyClientManager.initialize({
            host: process.env.DRAGONFLY_HOST || 'localhost',
            port: parseInt(process.env.DRAGONFLY_PORT || '6379', 10)
        });

        const health = await DragonflyClientManager.healthCheck();
        if (!health.connected) {
            throw new Error('DragonflyDB not available');
        }

        console.log(`✅ Connected (latency: ${health.latency}ms, version: ${health.version})`);

        // 运行所有测试
        const results = [];

        results.push(await testSlidingWindow());
        results.push(await testTokenBucket());
        results.push(await testLeakyBucket());
        results.push(await testPerformance());

        // 总结
        console.log('\n');
        console.log('═'.repeat(60));
        const passed = results.filter(r => r).length;
        const total = results.length;

        if (passed === total) {
            console.log(`\n✅ All tests passed! (${passed}/${total})`);
            console.log('\n🎉 DragonflyDB rate limiters are working perfectly!\n');
            process.exit(0);
        } else {
            console.log(`\n❌ Some tests failed (${passed}/${total} passed)`);
            process.exit(1);
        }

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        await DragonflyClientManager.disconnect();
    }
}

// 运行
if (require.main === module) {
    main().catch(console.error);
}
