#!/usr/bin/env tsx

/**
 * 🎮 单机模式测试 - 1房间1用户
 *
 * 验证最基础的单人游戏场景
 */

import WebSocket from 'ws';

const GATEWAY_URL = 'ws://localhost:3000';
const USER_ID = 'single_player_001';
const ROOM_ID = 'single_room_001';
const TEST_DURATION = 10000; // 10秒测试

interface TestMetrics {
    connected: boolean;
    authenticated: boolean;
    roomJoined: boolean;
    coinsDropped: number;
    coinsDropSuccess: number;
    framesReceived: number;
    errors: string[];
    startTime: number;
    endTime: number;
}

const metrics: TestMetrics = {
    connected: false,
    authenticated: false,
    roomJoined: false,
    coinsDropped: 0,
    coinsDropSuccess: 0,
    framesReceived: 0,
    errors: [],
    startTime: Date.now(),
    endTime: 0,
};

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                                                          ║');
console.log('║       🎮 Single Player Mode Test                         ║');
console.log('║                                                          ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log('📊 Test Configuration:');
console.log(`   • User: ${USER_ID}`);
console.log(`   • Room: ${ROOM_ID}`);
console.log(`   • Duration: ${TEST_DURATION / 1000}s`);
console.log(`   • Gateway: ${GATEWAY_URL}\n`);

const ws = new WebSocket(GATEWAY_URL);

ws.on('open', () => {
    metrics.connected = true;
    console.log('✅ Connected to Gateway\n');
});

ws.on('message', (data: Buffer) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
        case 'connected':
            console.log('🔐 Authenticating...');
            send({
                type: 'auth',
                payload: {
                    userId: USER_ID,
                    token: 'test-token'
                }
            });
            break;

        case 'auth_success':
            metrics.authenticated = true;
            console.log('✅ Authenticated\n');
            console.log('🚪 Joining room...');
            send({
                type: 'join_room',
                payload: {
                    roomId: ROOM_ID
                }
            });
            break;

        case 'room_joined':
            metrics.roomJoined = true;
            console.log('✅ Room joined\n');
            console.log('🎮 Starting game simulation...\n');

            // 开始投币测试
            startCoinDropTest();
            break;

        case 'coin_dropped':
            metrics.coinsDropSuccess++;
            const coinId = message.data.coinId;
            console.log(`  💰 Coin ${coinId} dropped (${metrics.coinsDropSuccess}/${metrics.coinsDropped})`);
            break;

        case 'physics_frame':
            metrics.framesReceived++;
            // 只打印第一帧和每100帧
            if (metrics.framesReceived === 1 || metrics.framesReceived % 100 === 0) {
                console.log(`  📡 Physics frames received: ${metrics.framesReceived}`);
            }
            break;

        case 'error':
            metrics.errors.push(message.error);
            console.error(`  ❌ Error: ${message.error}`);
            break;
    }
});

ws.on('close', () => {
    metrics.endTime = Date.now();
    printResults();
    process.exit(0);
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    metrics.errors.push(error.message);
    process.exit(1);
});

function send(message: any) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

function dropCoin() {
    const x = (Math.random() - 0.5) * 4; // -2 to 2
    metrics.coinsDropped++;

    send({
        type: 'drop_coin',
        payload: {
            x,
            z: -6,
            requestId: `coin-${Date.now()}-${Math.random()}`
        }
    });
}

function startCoinDropTest() {
    // 每2秒投一个币
    const dropInterval = setInterval(() => {
        dropCoin();
    }, 2000);

    // 测试持续时间后停止
    setTimeout(() => {
        clearInterval(dropInterval);
        console.log('\n⏰ Test duration completed\n');

        // 等待最后的响应
        setTimeout(() => {
            ws.close();
        }, 1000);
    }, TEST_DURATION);
}

function printResults() {
    const duration = (metrics.endTime - metrics.startTime) / 1000;

    console.log('\n═'.repeat(60));
    console.log('\n📊 Test Results:\n');

    console.log('🔌 Connection:');
    console.log(`   • Connected:     ${metrics.connected ? '✅ Yes' : '❌ No'}`);
    console.log(`   • Authenticated: ${metrics.authenticated ? '✅ Yes' : '❌ No'}`);
    console.log(`   • Room Joined:   ${metrics.roomJoined ? '✅ Yes' : '❌ No'}`);

    console.log('\n💰 Coin Drops:');
    console.log(`   • Attempted: ${metrics.coinsDropped}`);
    console.log(`   • Successful: ${metrics.coinsDropSuccess} (${(metrics.coinsDropSuccess / metrics.coinsDropped * 100).toFixed(1)}%)`);
    console.log(`   • Failed: ${metrics.coinsDropped - metrics.coinsDropSuccess}`);

    console.log('\n📡 Physics Frames:');
    console.log(`   • Total Received: ${metrics.framesReceived}`);
    console.log(`   • Frame Rate: ${(metrics.framesReceived / duration).toFixed(1)} frames/s`);

    console.log('\n⏱️  Duration:');
    console.log(`   • Test Duration: ${duration.toFixed(2)}s`);

    if (metrics.errors.length > 0) {
        console.log('\n❌ Errors:');
        metrics.errors.forEach(error => console.log(`   • ${error}`));
    }

    console.log('\n✅ Assessment:');
    const passedTests: string[] = [];
    const failedTests: string[] = [];

    if (metrics.connected && metrics.authenticated && metrics.roomJoined) {
        passedTests.push('Connection and authentication');
    } else {
        failedTests.push('Connection or authentication failed');
    }

    const successRate = metrics.coinsDropSuccess / metrics.coinsDropped;
    if (successRate >= 0.9) {
        passedTests.push('Coin drop success rate > 90%');
    } else {
        failedTests.push(`Coin drop success rate: ${(successRate * 100).toFixed(1)}% (< 90%)`);
    }

    if (metrics.framesReceived > 0) {
        passedTests.push('Physics frames received');
    } else {
        failedTests.push('No physics frames received');
    }

    passedTests.forEach(test => console.log(`   ✅ ${test}`));
    failedTests.forEach(test => console.log(`   ❌ ${test}`));

    console.log('\n' + '═'.repeat(60));

    if (failedTests.length === 0) {
        console.log('\n🎉 Single player test passed!\n');
    } else {
        console.log(`\n⚠️  ${failedTests.length} test(s) failed\n`);
    }
}

// 超时保护
setTimeout(() => {
    console.log('\n⏰ Test timeout - forcing exit\n');
    ws.close();
}, TEST_DURATION + 5000);
