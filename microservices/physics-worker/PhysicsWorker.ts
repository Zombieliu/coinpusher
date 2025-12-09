/**
 * ⚡ Physics Worker Service (集成真实物理引擎)
 *
 * 独立的物理计算服务 - 已集成 Rapier3D
 */

import { MessageQueue, PhysicsRequest, PhysicsResponse, PhysicsFrame } from '../shared/MessageQueue';
import { DragonflyClientManager } from '../../tsrpc_server/src/server/utils/DragonflyRateLimiter';
import { PhysicsWorld } from '../../tsrpc_server/src/server/room/bll/physics/PhysicsWorld';

/**
 * 房间实例（集成真实物理引擎）
 */
class RoomInstance {
    roomId: string;
    players: Set<string> = new Set();
    physicsWorld: PhysicsWorld;
    frameId: number = 0;
    lastUpdateTime: number = Date.now();
    lastActivityTime: number = Date.now();  // ⚡ 最后活动时间
    createdAt: number = Date.now();  // ⚡ 创建时间
    isActive: boolean = true;

    // 硬币元数据
    coinOwners: Map<number, string> = new Map();  // coinId -> userId

    constructor(roomId: string) {
        this.roomId = roomId;
        this.physicsWorld = new PhysicsWorld();
        console.log(`[Room ${roomId}] Created with Rapier3D physics`);
    }

    addPlayer(userId: string): void {
        this.players.add(userId);
        this.lastActivityTime = Date.now();  // ⚡ 更新活动时间
        console.log(`[Room ${this.roomId}] Player ${userId} joined (${this.players.size} players)`);
    }

    removePlayer(userId: string): void {
        this.players.delete(userId);
        this.lastActivityTime = Date.now();  // ⚡ 更新活动时间
        console.log(`[Room ${this.roomId}] Player ${userId} left (${this.players.size} players)`);
    }

    recordActivity(): void {
        this.lastActivityTime = Date.now();  // ⚡ 记录活动
    }

    getIdleTime(): number {
        return Date.now() - this.lastActivityTime;  // ⚡ 获取空闲时间
    }

    getAge(): number {
        return Date.now() - this.createdAt;  // ⚡ 获取房间年龄
    }

    isEmpty(): boolean {
        return this.players.size === 0;
    }

    destroy(): void {
        this.isActive = false;
        const age = this.getAge() / 1000;
        // PhysicsWorld 会在 GC 时自动清理
        console.log(`[Room ${this.roomId}] Destroyed (age: ${age.toFixed(1)}s, had ${this.physicsWorld.coins.size} coins)`);
    }
}

/**
 * Physics Worker 配置
 */
export interface PhysicsWorkerConfig {
    workerId: string;
    maxRooms: number;
    updateFPS: number;
    dragonflyHost: string;
    dragonflyPort: number;
}

/**
 * Physics Worker 服务（集成版）
 */
export class PhysicsWorkerService {
    private config: PhysicsWorkerConfig;
    private messageQueue!: MessageQueue;
    private rooms: Map<string, RoomInstance> = new Map();
    private updateTimer?: NodeJS.Timeout;
    private heartbeatTimer?: NodeJS.Timeout;
    private isRunning: boolean = false;
    private statsLastPrint: number = Date.now();

    // ⚡ 性能监控指标
    private metrics = {
        requestsProcessed: 0,
        requestsFailed: 0,
        totalProcessingTime: 0,  // 总处理时间（ms）
        lastResetTime: Date.now(),
    };

    constructor(config: PhysicsWorkerConfig) {
        this.config = config;
    }

    /**
     * 启动 Worker
     */
    async start(): Promise<void> {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║       ⚡ Physics Worker Service (Rapier3D)              ║
║                                                          ║
║   Worker ID: ${this.config.workerId.padEnd(42)} ║
║   Max Rooms: ${this.config.maxRooms.toString().padEnd(42)} ║
║   Update FPS: ${this.config.updateFPS.toString().padEnd(41)} ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
        `);

        // 初始化 Rapier3D
        console.log('[Worker] Initializing Rapier3D...');
        await PhysicsWorld.waitForInit();
        console.log('[Worker] ✅ Rapier3D initialized');

        // 初始化 DragonflyDB 连接
        console.log('[Worker] Connecting to DragonflyDB...');
        const client = DragonflyClientManager.initialize({
            host: this.config.dragonflyHost,
            port: this.config.dragonflyPort,
        });

        const health = await DragonflyClientManager.healthCheck();
        if (!health.connected) {
            throw new Error('Failed to connect to DragonflyDB');
        }
        console.log(`[Worker] ✅ Connected to DragonflyDB (latency: ${health.latency}ms)`);

        // 初始化消息队列
        this.messageQueue = new MessageQueue(client, this.config.workerId);
        console.log('[Worker] Message queue initialized');

        // 开始消费物理请求
        this.isRunning = true;
        console.log('[Worker] Starting to consume physics requests...');
        await this.messageQueue.consumePhysicsRequests(
            this.handlePhysicsRequest.bind(this)
        );

        // 启动物理更新循环
        this.startPhysicsLoop();

        // 启动心跳
        this.startHeartbeat();

        console.log('[Worker] ✅ Worker started successfully\n');
    }

    /**
     * 处理物理请求
     */
    private async handlePhysicsRequest(request: PhysicsRequest, msgId: string): Promise<void> {
        const startTime = Date.now();  // ⚡ 性能监控：记录开始时间
        const { requestId, roomId, userId, action, payload } = request;

        try {
            // 确保房间存在
            if (!this.rooms.has(roomId)) {
                if (this.rooms.size >= this.config.maxRooms) {
                    throw new Error(`Worker is at max capacity (${this.config.maxRooms} rooms)`);
                }
                this.createRoom(roomId);
            }

            const room = this.rooms.get(roomId)!;

            // 处理不同的操作
            let responseData: any;

            switch (action) {
                case 'join_room':
                    room.addPlayer(userId);
                    room.recordActivity();  // ⚡ 记录活动
                    responseData = {
                        success: true,
                        roomInfo: {
                            roomId,
                            playerCount: room.players.size,
                            coinCount: room.physicsWorld.coins.size
                        }
                    };
                    break;

                case 'leave_room':
                    room.removePlayer(userId);
                    room.recordActivity();  // ⚡ 记录活动
                    responseData = { success: true };
                    break;

                case 'drop_coin':
                    const x = payload.x !== undefined ? payload.x : 0;
                    const z = payload.z !== undefined ? payload.z : -6;

                    // 调用真实物理引擎
                    const coinId = room.physicsWorld.dropCoin(x, z);
                    room.coinOwners.set(coinId, userId);
                    room.recordActivity();  // ⚡ 记录活动

                    responseData = {
                        requestId: payload.requestId,  // 包含原始requestId用于客户端匹配
                        coinId,
                        x,
                        y: 10,  // 初始高度
                        z,
                        timestamp: Date.now()
                    };

                    console.log(`[Room ${roomId}] Player ${userId} dropped coin ${coinId} at x=${x.toFixed(2)}`);
                    break;

                case 'collect_coin':
                    const collectCoinId = payload.coinId;
                    const coin = room.physicsWorld.coins.get(collectCoinId);

                    if (coin) {
                        const pos = coin.translation();
                        // 检查是否在收集区
                        const isCollectable = pos.z > -0.5 && Math.abs(pos.x) < 1.5 && pos.y < 0.5;

                        if (isCollectable) {
                            // 移除硬币
                            room.physicsWorld.coins.delete(collectCoinId);
                            room.physicsWorld.world.removeRigidBody(coin);
                            room.coinOwners.delete(collectCoinId);
                            room.recordActivity();  // ⚡ 记录活动

                            responseData = {
                                collected: true,
                                coinId: collectCoinId,
                                reward: 10  // 奖励金额
                            };
                            console.log(`[Room ${roomId}] Player ${userId} collected coin ${collectCoinId}`);
                        } else {
                            throw new Error('Coin is not in collection area');
                        }
                    } else {
                        throw new Error('Coin not found');
                    }
                    break;

                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            // 发送响应
            const response: PhysicsResponse = {
                requestId,
                roomId,
                success: true,
                data: responseData,
                timestamp: Date.now(),
            };

            await this.messageQueue.publishPhysicsResponse(response);

            // ⚡ 性能监控：记录成功
            const processingTime = Date.now() - startTime;
            this.metrics.requestsProcessed++;
            this.metrics.totalProcessingTime += processingTime;

        } catch (error: any) {
            console.error(`[Worker] Error handling request ${requestId}:`, error.message);

            // ⚡ 性能监控：记录失败
            this.metrics.requestsFailed++;

            // 发送错误响应
            const errorResponse: PhysicsResponse = {
                requestId,
                roomId,
                success: false,
                error: error.message,
                timestamp: Date.now(),
            };

            await this.messageQueue.publishPhysicsResponse(errorResponse);
        }
    }

    /**
     * 创建房间
     */
    private createRoom(roomId: string): void {
        const room = new RoomInstance(roomId);
        this.rooms.set(roomId, room);
    }

    /**
     * 启动物理更新循环
     */
    private startPhysicsLoop(): void {
        const updateInterval = 1000 / this.config.updateFPS;

        this.updateTimer = setInterval(() => {
            this.updatePhysics();
        }, updateInterval);

        console.log(`[Worker] Physics loop started (${this.config.updateFPS} FPS, ${updateInterval.toFixed(1)}ms interval)`);
    }

    /**
     * 更新所有房间的物理状态
     */
    private async updatePhysics(): Promise<void> {
        const now = Date.now();
        let totalCoins = 0;
        let totalPlayers = 0;
        let framesProcessed = 0;

        for (const [roomId, room] of this.rooms.entries()) {
            if (!room.isActive) continue;

            try {
                // 计算 delta time
                const dt = (now - room.lastUpdateTime) / 1000;
                room.lastUpdateTime = now;

                // 执行真实物理步进
                const result = room.physicsWorld.step(dt);

                totalCoins += room.physicsWorld.coins.size;
                totalPlayers += room.players.size;

                // 只有在有变化时才广播
                if (result.coins.length > 0 || result.collected.length > 0 || result.removed.length > 0) {
                    const frame: PhysicsFrame = {
                        roomId,
                        frameId: room.frameId++,
                        timestamp: now,
                        coins: result.coins.map((c: any) => ({
                            id: c.id,
                            x: c.p.x,
                            y: c.p.y,
                            z: c.p.z,
                            rotation: c.r
                        })),
                        collected: result.collected,
                        removed: result.removed,
                    };

                    await this.messageQueue.broadcastPhysicsFrame(frame);
                    framesProcessed++;
                }

                // ⚡ 清理空闲房间（改进版）
                const idleTime = room.getIdleTime();
                const idleThreshold = 5 * 60 * 1000;  // 5分钟无活动
                if (room.isEmpty() && idleTime > idleThreshold) {
                    console.log(`[Worker] ♻️  Auto-cleaning idle room: ${roomId} (idle: ${(idleTime / 1000).toFixed(0)}s)`);
                    room.destroy();
                    this.rooms.delete(roomId);
                }

            } catch (error: any) {
                console.error(`[Worker] Error updating room ${roomId}:`, error.message);
            }
        }

        // ⚡ 定期打印统计信息（每10秒）
        if (now - this.statsLastPrint > 10000) {
            if (this.rooms.size > 0 || this.metrics.requestsProcessed > 0) {
                const timeSinceReset = (now - this.metrics.lastResetTime) / 1000;
                const reqPerSec = this.metrics.requestsProcessed / timeSinceReset;
                const avgProcessingTime = this.metrics.requestsProcessed > 0
                    ? this.metrics.totalProcessingTime / this.metrics.requestsProcessed
                    : 0;
                const successRate = this.metrics.requestsProcessed + this.metrics.requestsFailed > 0
                    ? (this.metrics.requestsProcessed / (this.metrics.requestsProcessed + this.metrics.requestsFailed) * 100)
                    : 100;

                console.log(`[Worker] ⚡ Performance: ${reqPerSec.toFixed(1)} req/s, avg ${avgProcessingTime.toFixed(0)}ms, ${successRate.toFixed(1)}% success`);
                console.log(`[Worker] Stats: ${this.rooms.size} rooms, ${totalPlayers} players, ${totalCoins} coins, ${framesProcessed} frames`);

                // ⚡ 容量监控和告警
                const capacityUsage = this.rooms.size / this.config.maxRooms;
                if (capacityUsage >= 0.9) {
                    console.error(`[Worker] 🚨 CRITICAL: Capacity at ${(capacityUsage * 100).toFixed(1)}% (${this.rooms.size}/${this.config.maxRooms} rooms)`);
                } else if (capacityUsage >= 0.8) {
                    console.warn(`[Worker] ⚠️  WARNING: Capacity at ${(capacityUsage * 100).toFixed(1)}% (${this.rooms.size}/${this.config.maxRooms} rooms)`);
                } else if (capacityUsage >= 0.6) {
                    console.log(`[Worker] ℹ️  INFO: Capacity at ${(capacityUsage * 100).toFixed(1)}% (${this.rooms.size}/${this.config.maxRooms} rooms)`);
                }

                // 重置指标
                this.metrics = {
                    requestsProcessed: 0,
                    requestsFailed: 0,
                    totalProcessingTime: 0,
                    lastResetTime: now,
                };
            }
            this.statsLastPrint = now;
        }
    }

    /**
     * 启动心跳
     */
    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(async () => {
            try {
                const roomIds = Array.from(this.rooms.keys());
                await this.messageQueue.sendWorkerHeartbeat(
                    this.config.workerId,
                    roomIds
                );
            } catch (error: any) {
                console.error('[Worker] Heartbeat error:', error.message);
            }
        }, 5000);  // 每 5 秒一次心跳

        console.log('[Worker] Heartbeat started (5s interval)');
    }

    /**
     * 停止 Worker
     */
    async stop(): Promise<void> {
        console.log('[Worker] Stopping...');

        this.isRunning = false;

        // 停止定时器
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        // 停止消息队列
        if (this.messageQueue) {
            this.messageQueue.stop();
        }

        // 清理所有房间
        for (const room of this.rooms.values()) {
            room.destroy();
        }
        this.rooms.clear();

        // 断开 DragonflyDB
        await DragonflyClientManager.disconnect();

        console.log('[Worker] ✅ Worker stopped');
    }

    /**
     * 获取状态
     */
    getStatus() {
        let totalCoins = 0;
        let totalPlayers = 0;

        const rooms = Array.from(this.rooms.entries()).map(([roomId, room]) => {
            totalCoins += room.physicsWorld.coins.size;
            totalPlayers += room.players.size;

            return {
                roomId,
                playerCount: room.players.size,
                coinCount: room.physicsWorld.coins.size,
                frameId: room.frameId,
            };
        });

        return {
            workerId: this.config.workerId,
            isRunning: this.isRunning,
            roomCount: this.rooms.size,
            maxRooms: this.config.maxRooms,
            totalPlayers,
            totalCoins,
            rooms,
        };
    }
}

// ============ 启动脚本 ============

async function main() {
    const config: PhysicsWorkerConfig = {
        workerId: process.env.WORKER_ID || `worker-${process.pid}`,
        maxRooms: parseInt(process.env.MAX_ROOMS || '20', 10),
        updateFPS: parseInt(process.env.UPDATE_FPS || '20', 10),  // ⚡ 降低到 20 FPS（减少 33% CPU 使用）
        dragonflyHost: process.env.DRAGONFLY_HOST || 'localhost',
        dragonflyPort: parseInt(process.env.DRAGONFLY_PORT || '6379', 10),
    };

    const worker = new PhysicsWorkerService(config);

    // 优雅退出
    process.on('SIGINT', async () => {
        console.log('\n[Worker] Received SIGINT, shutting down...');
        await worker.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n[Worker] Received SIGTERM, shutting down...');
        await worker.stop();
        process.exit(0);
    });

    try {
        await worker.start();

        // 定期输出状态
        setInterval(() => {
            const status = worker.getStatus();
            if (status.roomCount > 0) {
                console.log(`[Worker] Status: ${status.roomCount}/${status.maxRooms} rooms, ${status.totalPlayers} players, ${status.totalCoins} coins`);
            }
        }, 30000);

    } catch (error: any) {
        console.error('[Worker] Fatal error:', error);
        process.exit(1);
    }
}

// 如果直接运行此文件，则启动 Worker
if (require.main === module) {
    main().catch(console.error);
}
