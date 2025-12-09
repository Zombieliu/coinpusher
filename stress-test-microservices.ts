#!/usr/bin/env ts-node

/**
 * 🔥 微服务架构压力测试
 *
 * 模拟 1,000+ 并发用户，验证系统性能
 */

import WebSocket from 'ws';
import { performance } from 'perf_hooks';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface TestConfig {
    gatewayUrl: string;
    numUsers: number;
    numRooms: number;
    dropCoinInterval: number;  // 每个用户投币间隔（毫秒）
    testDuration: number;      // 测试持续时间（毫秒）
}

interface TestMetrics {
    totalConnections: number;
    successfulConnections: number;
    failedConnections: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalFramesReceived: number;
    latencies: number[];
    connectionTimes: number[];
    startTime: number;
    endTime: number;
}

class StressTestClient {
    private ws: WebSocket | null = null;
    private userId: string;
    private roomId: string;
    private gatewayUrl: string;
    private metrics: TestMetrics;
    private pendingRequests: Map<string, { timestamp: number; type: string }> = new Map();
    private isConnected: boolean = false;
    private isAuthenticated: boolean = false;

    constructor(userId: string, roomId: string, gatewayUrl: string, metrics: TestMetrics) {
        this.userId = userId;
        this.roomId = roomId;
        this.gatewayUrl = gatewayUrl;
        this.metrics = metrics;
    }

    async connect(): Promise<boolean> {
        const startTime = performance.now();

        return new Promise((resolve) => {
            try {
                this.ws = new WebSocket(this.gatewayUrl);

                this.ws.on('open', () => {
                    const connectionTime = performance.now() - startTime;
                    this.metrics.connectionTimes.push(connectionTime);
                    this.isConnected = true;
                    this.metrics.successfulConnections++;
                    resolve(true);
                });

                this.ws.on('message', (data: Buffer) => {
                    this.handleMessage(data);
                });

                this.ws.on('error', (error) => {
                    console.error(`[Client ${this.userId}] WebSocket error:`, error.message);
                    this.metrics.failedConnections++;
                    resolve(false);
                });

                this.ws.on('close', () => {
                    this.isConnected = false;
                });

                // 超时处理
                setTimeout(() => {
                    if (!this.isConnected) {
                        this.metrics.failedConnections++;
                        resolve(false);
                    }
                }, 5000);

            } catch (error) {
                this.metrics.failedConnections++;
                resolve(false);
            }
        });
    }

    private handleMessage(data: Buffer): void {
        try {
            const message = JSON.parse(data.toString());
            const { type } = message;

            switch (type) {
                case 'connected':
                    // 自动认证
                    this.authenticate();
                    break;

                case 'auth_success':
                    this.isAuthenticated = true;
                    // 自动加入房间
                    this.joinRoom();
                    break;

                case 'room_joined':
                    // 房间加入成功
                    break;

                case 'coin_dropped':
                case 'coin_collected':
                    // 记录响应延迟
                    const requestId = message.data?.requestId;
                    if (requestId && this.pendingRequests.has(requestId)) {
                        const req = this.pendingRequests.get(requestId)!;
                        const latency = Date.now() - req.timestamp;
                        this.metrics.latencies.push(latency);
                        this.pendingRequests.delete(requestId);
                        this.metrics.successfulRequests++;
                    }
                    break;

                case 'physics_frame':
                    // 接收到物理帧
                    this.metrics.totalFramesReceived++;
                    break;

                case 'error':
                    this.metrics.failedRequests++;
                    break;
            }
        } catch (error) {
            // Ignore parse errors
        }
    }

    private send(message: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private authenticate(): void {
        this.send({
            type: 'auth',
            payload: {
                userId: this.userId,
                token: 'test-token',
            },
        });
    }

    private joinRoom(): void {
        this.send({
            type: 'join_room',
            payload: {
                roomId: this.roomId,
            },
        });
    }

    async dropCoin(x: number): Promise<void> {
        if (!this.isAuthenticated) {
            return;
        }

        const requestId = `req-${Date.now()}-${Math.random()}`;
        this.pendingRequests.set(requestId, {
            timestamp: Date.now(),
            type: 'drop_coin',
        });

        this.metrics.totalRequests++;

        this.send({
            type: 'drop_coin',
            payload: {
                x,
                requestId,
            },
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
        }
    }
}

/**
 * 压力测试
 */
async function runStressTest(config: TestConfig): Promise<TestMetrics> {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║       🔥 Microservices Stress Test                      ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    console.log(`\n📊 Test Configuration:`);
    console.log(`   • Users: ${config.numUsers}`);
    console.log(`   • Rooms: ${config.numRooms}`);
    console.log(`   • Drop Interval: ${config.dropCoinInterval}ms`);
    console.log(`   • Duration: ${config.testDuration / 1000}s`);
    console.log(`   • Gateway: ${config.gatewayUrl}\n`);

    const metrics: TestMetrics = {
        totalConnections: config.numUsers,
        successfulConnections: 0,
        failedConnections: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalFramesReceived: 0,
        latencies: [],
        connectionTimes: [],
        startTime: Date.now(),
        endTime: 0,
    };

    // ============ 阶段 1: 建立连接 ============
    console.log('🔌 Phase 1: Establishing connections...');

    const clients: StressTestClient[] = [];
    const connectPromises: Promise<boolean>[] = [];

    for (let i = 0; i < config.numUsers; i++) {
        const userId = `user_${i}`;
        const roomId = `room_${i % config.numRooms}`;  // 均匀分配到房间

        const client = new StressTestClient(userId, roomId, config.gatewayUrl, metrics);
        clients.push(client);
        connectPromises.push(client.connect());

        // 每 10 个连接打印一次进度
        if ((i + 1) % 50 === 0 || i === config.numUsers - 1) {
            process.stdout.write(`\r   Connecting: ${i + 1}/${config.numUsers}`);
        }

        // 避免连接风暴，每 5 个连接暂停 10ms
        if ((i + 1) % 5 === 0) {
            await sleep(10);
        }
    }

    // 等待所有连接建立
    await Promise.all(connectPromises);

    console.log(`\n   ✅ Connections: ${metrics.successfulConnections} successful, ${metrics.failedConnections} failed`);

    if (metrics.successfulConnections === 0) {
        throw new Error('Failed to establish any connections');
    }

    await sleep(2000);  // 等待所有客户端完成认证和加入房间

    // ============ 阶段 2: 模拟用户行为 ============
    console.log('\n🎮 Phase 2: Simulating user actions...');

    const testStart = Date.now();
    const testEnd = testStart + config.testDuration;

    let dropCount = 0;

    while (Date.now() < testEnd) {
        const elapsed = Date.now() - testStart;
        const progress = ((elapsed / config.testDuration) * 100).toFixed(1);

        // 每个用户随机投币
        const promises = clients.map(async (client, index) => {
            // 随机决定是否投币（模拟真实用户行为）
            if (Math.random() < 0.3) {  // 30% 概率投币
                const x = (Math.random() - 0.5) * 6;  // -3 到 3
                await client.dropCoin(x);
                dropCount++;
            }
        });

        await Promise.all(promises);

        process.stdout.write(`\r   Progress: ${progress}% | Requests: ${metrics.totalRequests} | Frames: ${metrics.totalFramesReceived}`);

        await sleep(config.dropCoinInterval);
    }

    console.log('\n   ✅ Test duration completed');

    // ============ 阶段 3: 清理 ============
    console.log('\n🧹 Phase 3: Cleaning up...');

    clients.forEach(client => client.disconnect());

    await sleep(1000);

    metrics.endTime = Date.now();

    return metrics;
}

/**
 * 分析测试结果
 */
function analyzeMetrics(metrics: TestMetrics, config: TestConfig): void {
    const duration = (metrics.endTime - metrics.startTime) / 1000;

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('\n📊 Test Results:\n');

    // 连接统计
    console.log('🔌 Connections:');
    console.log(`   • Total:      ${metrics.totalConnections}`);
    console.log(`   • Successful: ${metrics.successfulConnections} (${(metrics.successfulConnections / metrics.totalConnections * 100).toFixed(1)}%)`);
    console.log(`   • Failed:     ${metrics.failedConnections} (${(metrics.failedConnections / metrics.totalConnections * 100).toFixed(1)}%)`);

    if (metrics.connectionTimes.length > 0) {
        const avgConnTime = metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length;
        const maxConnTime = Math.max(...metrics.connectionTimes);
        console.log(`   • Avg Connection Time: ${avgConnTime.toFixed(2)}ms`);
        console.log(`   • Max Connection Time: ${maxConnTime.toFixed(2)}ms`);
    }

    // 请求统计
    console.log('\n📤 Requests:');
    console.log(`   • Total:      ${metrics.totalRequests}`);
    console.log(`   • Successful: ${metrics.successfulRequests} (${(metrics.successfulRequests / metrics.totalRequests * 100).toFixed(1)}%)`);
    console.log(`   • Failed:     ${metrics.failedRequests} (${(metrics.failedRequests / metrics.totalRequests * 100).toFixed(1)}%)`);
    console.log(`   • Throughput: ${(metrics.totalRequests / duration).toFixed(1)} req/s`);

    // 延迟统计
    if (metrics.latencies.length > 0) {
        const sortedLatencies = metrics.latencies.sort((a, b) => a - b);
        const avgLatency = sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length;
        const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
        const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
        const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
        const maxLatency = Math.max(...sortedLatencies);

        console.log('\n⚡ Latency:');
        console.log(`   • Avg:  ${avgLatency.toFixed(2)}ms`);
        console.log(`   • P50:  ${p50}ms`);
        console.log(`   • P95:  ${p95}ms`);
        console.log(`   • P99:  ${p99}ms`);
        console.log(`   • Max:  ${maxLatency}ms`);
    }

    // 物理帧统计
    console.log('\n📡 Physics Frames:');
    console.log(`   • Total Received: ${metrics.totalFramesReceived}`);
    console.log(`   • Frame Rate:     ${(metrics.totalFramesReceived / duration).toFixed(1)} frames/s`);

    // 评估
    console.log('\n✅ Assessment:');

    const passedTests: string[] = [];
    const failedTests: string[] = [];

    // 1. 连接成功率
    const connSuccessRate = metrics.successfulConnections / metrics.totalConnections;
    if (connSuccessRate >= 0.95) {
        passedTests.push('Connection success rate > 95%');
    } else {
        failedTests.push(`Connection success rate: ${(connSuccessRate * 100).toFixed(1)}% (< 95%)`);
    }

    // 2. 请求成功率
    const reqSuccessRate = metrics.successfulRequests / metrics.totalRequests;
    if (reqSuccessRate >= 0.9) {
        passedTests.push('Request success rate > 90%');
    } else {
        failedTests.push(`Request success rate: ${(reqSuccessRate * 100).toFixed(1)}% (< 90%)`);
    }

    // 3. P95 延迟
    if (metrics.latencies.length > 0) {
        const sortedLatencies = metrics.latencies.sort((a, b) => a - b);
        const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
        if (p95 < 100) {
            passedTests.push('P95 latency < 100ms');
        } else {
            failedTests.push(`P95 latency: ${p95}ms (> 100ms)`);
        }
    }

    // 4. 吞吐量
    const throughput = metrics.totalRequests / duration;
    if (throughput > 100) {
        passedTests.push('Throughput > 100 req/s');
    } else {
        failedTests.push(`Throughput: ${throughput.toFixed(1)} req/s (< 100)`);
    }

    passedTests.forEach(test => console.log(`   ✅ ${test}`));
    failedTests.forEach(test => console.log(`   ❌ ${test}`));

    console.log('\n');
    console.log('═'.repeat(60));

    if (failedTests.length === 0) {
        console.log('\n🎉 All stress tests passed!\n');
    } else {
        console.log(`\n⚠️  ${failedTests.length} test(s) failed\n`);
    }
}

// ============ 主函数 ============

async function main() {
    // 测试配置
    const configs = [
        {
            name: 'Small Scale (100 users)',
            config: {
                gatewayUrl: 'ws://localhost:3000',
                numUsers: 100,
                numRooms: 5,
                dropCoinInterval: 2000,
                testDuration: 30000,
            },
        },
        {
            name: 'Medium Scale (500 users)',
            config: {
                gatewayUrl: 'ws://localhost:3000',
                numUsers: 500,
                numRooms: 20,
                dropCoinInterval: 3000,
                testDuration: 60000,
            },
        },
        {
            name: 'Large Scale (1000 users)',
            config: {
                gatewayUrl: 'ws://localhost:3000',
                numUsers: 1000,
                numRooms: 50,
                dropCoinInterval: 5000,
                testDuration: 90000,
            },
        },
    ];

    // 选择测试规模
    const scaleIndex = parseInt(process.env.SCALE || '0', 10);
    const { name, config } = configs[scaleIndex] || configs[0];

    console.log(`\nRunning: ${name}\n`);

    try {
        const metrics = await runStressTest(config);
        analyzeMetrics(metrics, config);
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
