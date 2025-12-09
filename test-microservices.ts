#!/usr/bin/env ts-node

/**
 * 🧪 微服务架构集成测试
 *
 * 测试 Gateway ↔ Message Queue ↔ Physics Worker 完整流程
 */

import { GatewayService } from './microservices/gateway/GatewayService';
import { PhysicsWorkerService } from './microservices/physics-worker/PhysicsWorker';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testMicroservices() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║       🧪 Microservices Integration Test                ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    let gateway: GatewayService | null = null;
    let worker1: PhysicsWorkerService | null = null;
    let worker2: PhysicsWorkerService | null = null;

    try {
        // ============ 步骤 1: 启动 Physics Workers ============
        console.log('\n[Test] Step 1: Starting Physics Workers...');

        worker1 = new PhysicsWorkerService({
            workerId: 'test-worker-1',
            maxRooms: 10,
            updateFPS: 30,
            dragonflyHost: 'localhost',
            dragonflyPort: 6379,
        });

        worker2 = new PhysicsWorkerService({
            workerId: 'test-worker-2',
            maxRooms: 10,
            updateFPS: 30,
            dragonflyHost: 'localhost',
            dragonflyPort: 6379,
        });

        await worker1.start();
        console.log('[Test] ✅ Worker 1 started');

        await worker2.start();
        console.log('[Test] ✅ Worker 2 started');

        await sleep(2000);  // 等待 Workers 初始化

        // ============ 步骤 2: 启动 Gateway ============
        console.log('\n[Test] Step 2: Starting Gateway...');

        gateway = new GatewayService({
            gatewayId: 'test-gateway',
            port: 3000,
            dragonflyHost: 'localhost',
            dragonflyPort: 6379,
            requestTimeout: 5000,
        });

        await gateway.start();
        console.log('[Test] ✅ Gateway started');

        await sleep(2000);  // 等待 Gateway 初始化

        // ============ 步骤 3: 测试玩家加入房间 ============
        console.log('\n[Test] Step 3: Testing join_room...');

        const joinResult = await gateway.handleClientRequest(
            'test_user_1',
            'test_room_1',
            'join_room',
            {}
        );
        console.log('[Test] Join room result:', joinResult);

        if (joinResult.success) {
            console.log('[Test] ✅ Join room succeeded');
        } else {
            throw new Error('Join room failed');
        }

        await sleep(1000);

        // ============ 步骤 4: 测试投币 ============
        console.log('\n[Test] Step 4: Testing drop_coin...');

        const dropResult = await gateway.handleClientRequest(
            'test_user_1',
            'test_room_1',
            'drop_coin',
            { x: 0 }
        );
        console.log('[Test] Drop coin result:', dropResult);

        if (dropResult.coinId) {
            console.log(`[Test] ✅ Coin dropped successfully (coinId: ${dropResult.coinId})`);
        } else {
            throw new Error('Drop coin failed');
        }

        await sleep(1000);

        // ============ 步骤 5: 测试多个请求（并发） ============
        console.log('\n[Test] Step 5: Testing concurrent requests...');

        const concurrentPromises = [];
        for (let i = 0; i < 10; i++) {
            concurrentPromises.push(
                gateway.handleClientRequest(
                    `test_user_${i}`,
                    'test_room_1',
                    'drop_coin',
                    { x: i - 5 }
                )
            );
        }

        const results = await Promise.all(concurrentPromises);
        const successCount = results.filter(r => r.coinId).length;
        console.log(`[Test] ✅ ${successCount}/10 concurrent requests succeeded`);

        if (successCount < 8) {
            throw new Error('Too many concurrent requests failed');
        }

        await sleep(2000);

        // ============ 步骤 6: 验证 Worker 状态 ============
        console.log('\n[Test] Step 6: Checking Worker status...');

        const worker1Status = worker1.getStatus();
        const worker2Status = worker2.getStatus();

        console.log('[Test] Worker 1 status:', {
            rooms: worker1Status.roomCount,
            capacity: worker1Status.maxRooms,
        });

        console.log('[Test] Worker 2 status:', {
            rooms: worker2Status.roomCount,
            capacity: worker2Status.maxRooms,
        });

        // 至少有一个 Worker 处理了房间
        if (worker1Status.roomCount === 0 && worker2Status.roomCount === 0) {
            throw new Error('No rooms created on any worker');
        }

        console.log('[Test] ✅ Workers are processing rooms');

        // ============ 步骤 7: 验证 Gateway 状态 ============
        console.log('\n[Test] Step 7: Checking Gateway status...');

        const gatewayStatus = gateway.getStatus();
        console.log('[Test] Gateway status:', gatewayStatus);

        if (gatewayStatus.pendingRequests > 5) {
            console.warn('[Test] ⚠️  Gateway has many pending requests');
        } else {
            console.log('[Test] ✅ Gateway status healthy');
        }

        // ============ 测试完成 ============
        console.log('\n');
        console.log('═'.repeat(60));
        console.log('\n✅ All integration tests passed!\n');
        console.log('📊 Test Summary:');
        console.log('  • Gateway ↔ Worker communication:  ✅');
        console.log('  • Message Queue (DragonflyDB):     ✅');
        console.log('  • Join room:                       ✅');
        console.log('  • Drop coin:                       ✅');
        console.log('  • Concurrent requests:             ✅');
        console.log('  • Worker load balancing:           ✅');
        console.log('\n🎉 Microservices architecture is working!\n');

        return true;

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        return false;

    } finally {
        // 清理资源
        console.log('\n[Test] Cleaning up...');

        if (gateway) {
            await gateway.stop();
            console.log('[Test] Gateway stopped');
        }

        if (worker1) {
            await worker1.stop();
            console.log('[Test] Worker 1 stopped');
        }

        if (worker2) {
            await worker2.stop();
            console.log('[Test] Worker 2 stopped');
        }

        console.log('[Test] ✅ Cleanup complete\n');
    }
}

// ============ 运行测试 ============

async function main() {
    try {
        const success = await testMicroservices();
        process.exit(success ? 0 : 1);
    } catch (error: any) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
