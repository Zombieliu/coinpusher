/**
 * 🌐 Gateway Service (with WebSocket Support)
 *
 * 集成 WebSocket 的网关服务
 * - 接收客户端 WebSocket 连接
 * - 转发到物理 Worker（通过消息队列）
 * - 实时广播物理帧更新
 */

import { MessageQueue, PhysicsRequest, PhysicsResponse, PhysicsFrame } from '../shared/MessageQueue';
import { DragonflyClientManager, SlidingWindowLimiter } from '../../tsrpc_server/src/server/utils/DragonflyRateLimiter';
import { v4 as uuidv4 } from 'uuid';
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

/**
 * 待处理的请求
 */
interface PendingRequest {
    requestId: string;
    resolve: (data: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    timestamp: number;
}

/**
 * 客户端连接
 */
interface ClientConnection {
    connectionId: string;
    ws: WebSocket;
    userId?: string;
    roomId?: string;
    isAuthenticated: boolean;
    createdAt: number;
}

/**
 * Gateway 配置
 */
export interface GatewayConfig {
    gatewayId: string;
    port: number;
    dragonflyHost: string;
    dragonflyPort: number;
    requestTimeout: number;
}

/**
 * Gateway 服务（with WebSocket）
 */
export class GatewayService {
    private config: GatewayConfig;
    private messageQueue!: MessageQueue;
    private rateLimiter!: SlidingWindowLimiter;
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private connections: Map<string, ClientConnection> = new Map();
    private roomSubscriptions: Map<string, Set<string>> = new Map();  // roomId -> Set<connectionId>
    private isRunning: boolean = false;
    private httpServer!: http.Server;
    private wsServer!: WebSocketServer;

    constructor(config: GatewayConfig) {
        this.config = config;
    }

    /**
     * 启动 Gateway
     */
    async start(): Promise<void> {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║       🌐 Gateway Service (WebSocket Enabled)            ║
║                                                          ║
║   Gateway ID: ${this.config.gatewayId.padEnd(39)} ║
║   Port: ${this.config.port.toString().padEnd(47)} ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
        `);

        // 初始化 DragonflyDB
        console.log('[Gateway] Connecting to DragonflyDB...');
        const client = DragonflyClientManager.initialize({
            host: this.config.dragonflyHost,
            port: this.config.dragonflyPort,
        });

        const health = await DragonflyClientManager.healthCheck();
        if (!health.connected) {
            throw new Error('Failed to connect to DragonflyDB');
        }
        console.log(`[Gateway] ✅ Connected to DragonflyDB (latency: ${health.latency}ms)`);

        // 初始化限流器
        this.rateLimiter = new SlidingWindowLimiter(client, 'drop_coin', 60, 60000);
        console.log('[Gateway] Rate limiter initialized (60 req/min)');

        // 初始化消息队列
        this.messageQueue = new MessageQueue(client, this.config.gatewayId);
        console.log('[Gateway] Message queue initialized');

        // 启动 WebSocket 服务器
        this.startWebSocketServer();

        // 开始消费物理响应
        this.isRunning = true;
        console.log('[Gateway] Starting to consume physics responses...');
        await this.messageQueue.consumePhysicsResponses(
            this.handlePhysicsResponse.bind(this)
        );

        // 订阅物理帧广播
        console.log('[Gateway] Subscribing to physics frames...');
        await this.messageQueue.subscribePhysicsFrames(
            this.handlePhysicsFrame.bind(this)
        );

        console.log('[Gateway] ✅ Gateway started successfully\n');
    }

    /**
     * 启动 WebSocket 服务器
     */
    private startWebSocketServer(): void {
        // 创建 HTTP 服务器
        this.httpServer = http.createServer((req, res) => {
            // 健康检查
            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.getStatus()));
                return;
            }

            res.writeHead(404);
            res.end('Not Found');
        });

        // 创建 WebSocket 服务器
        this.wsServer = new WebSocketServer({ server: this.httpServer });

        this.wsServer.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
            this.handleNewConnection(ws, req);
        });

        this.httpServer.listen(this.config.port, () => {
            console.log(`[Gateway] WebSocket server listening on port ${this.config.port}`);
        });
    }

    /**
     * 处理新的 WebSocket 连接
     */
    private handleNewConnection(ws: WebSocket, req: http.IncomingMessage): void {
        const connectionId = uuidv4();
        const connection: ClientConnection = {
            connectionId,
            ws,
            isAuthenticated: false,
            createdAt: Date.now(),
        };

        this.connections.set(connectionId, connection);
        console.log(`[Gateway] New connection: ${connectionId} (total: ${this.connections.size})`);

        // 发送欢迎消息
        this.sendToClient(connection, {
            type: 'connected',
            connectionId,
            timestamp: Date.now(),
        });

        // 处理消息
        ws.on('message', (data: Buffer) => {
            this.handleClientMessage(connection, data);
        });

        // 处理断开
        ws.on('close', () => {
            this.handleDisconnect(connection);
        });

        // 处理错误
        ws.on('error', (error: Error) => {
            console.error(`[Gateway] WebSocket error for ${connectionId}:`, error.message);
        });
    }

    /**
     * 处理客户端消息
     */
    private async handleClientMessage(connection: ClientConnection, data: Buffer): Promise<void> {
        try {
            const message = JSON.parse(data.toString());
            const { type, payload } = message;

            switch (type) {
                case 'auth':
                    // 认证
                    const { userId, token } = payload;
                    // TODO: 验证 token
                    connection.userId = userId;
                    connection.isAuthenticated = true;

                    this.sendToClient(connection, {
                        type: 'auth_success',
                        userId,
                        timestamp: Date.now(),
                    });
                    console.log(`[Gateway] User ${userId} authenticated (${connection.connectionId})`);
                    break;

                case 'join_room':
                    if (!connection.isAuthenticated) {
                        throw new Error('Not authenticated');
                    }

                    const roomId = payload.roomId;
                    connection.roomId = roomId;

                    // 订阅房间
                    this.subscribeRoom(roomId, connection.connectionId);

                    // 发送加入房间请求
                    const joinResult = await this.handlePhysicsRequest(
                        connection.userId!,
                        roomId,
                        'join_room',
                        {}
                    );

                    this.sendToClient(connection, {
                        type: 'room_joined',
                        roomId,
                        data: joinResult,
                        timestamp: Date.now(),
                    });
                    break;

                case 'drop_coin':
                    if (!connection.isAuthenticated || !connection.roomId) {
                        throw new Error('Not in a room');
                    }

                    const dropResult = await this.handlePhysicsRequest(
                        connection.userId!,
                        connection.roomId,
                        'drop_coin',
                        payload
                    );

                    this.sendToClient(connection, {
                        type: 'coin_dropped',
                        data: dropResult,
                        timestamp: Date.now(),
                    });
                    break;

                case 'collect_coin':
                    if (!connection.isAuthenticated || !connection.roomId) {
                        throw new Error('Not in a room');
                    }

                    const collectResult = await this.handlePhysicsRequest(
                        connection.userId!,
                        connection.roomId,
                        'collect_coin',
                        payload
                    );

                    this.sendToClient(connection, {
                        type: 'coin_collected',
                        data: collectResult,
                        timestamp: Date.now(),
                    });
                    break;

                case 'ping':
                    this.sendToClient(connection, {
                        type: 'pong',
                        timestamp: Date.now(),
                    });
                    break;

                default:
                    console.warn(`[Gateway] Unknown message type: ${type}`);
            }

        } catch (error: any) {
            console.error(`[Gateway] Error handling message:`, error.message);
            this.sendToClient(connection, {
                type: 'error',
                error: error.message,
                timestamp: Date.now(),
            });
        }
    }

    /**
     * 处理物理请求（内部方法）
     */
    private async handlePhysicsRequest(
        userId: string,
        roomId: string,
        action: string,
        payload: any
    ): Promise<any> {
        // 1. 限流检查
        const rateLimit = await this.rateLimiter.tryAcquire(userId);
        if (!rateLimit.allowed) {
            throw new Error(`Rate limit exceeded. Reset at ${new Date(rateLimit.resetAt).toISOString()}`);
        }

        // 2. 生成请求 ID
        const requestId = uuidv4();

        // 3. 创建 Promise 用于等待响应
        const responsePromise = new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout after ${this.config.requestTimeout}ms`));
            }, this.config.requestTimeout);

            this.pendingRequests.set(requestId, {
                requestId,
                resolve,
                reject,
                timeout,
                timestamp: Date.now(),
            });
        });

        // 4. 发送请求到消息队列
        const request: PhysicsRequest = {
            requestId,
            roomId,
            userId,
            action,
            payload,
            timestamp: Date.now(),
        };

        await this.messageQueue.publishPhysicsRequest(request);

        // 5. 等待响应
        return responsePromise;
    }

    /**
     * 处理物理响应
     */
    private async handlePhysicsResponse(response: PhysicsResponse, msgId: string): Promise<void> {
        const { requestId, success, data, error } = response;

        const pending = this.pendingRequests.get(requestId);
        if (!pending) {
            return;
        }

        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);

        if (success) {
            pending.resolve(data);
        } else {
            pending.reject(new Error(error || 'Unknown error'));
        }
    }

    /**
     * 处理物理帧广播
     */
    private async handlePhysicsFrame(frame: PhysicsFrame): Promise<void> {
        const { roomId } = frame;

        // 获取订阅该房间的所有连接
        const subscribers = this.roomSubscriptions.get(roomId);
        if (!subscribers || subscribers.size === 0) {
            return;
        }

        const message = {
            type: 'physics_frame',
            frame,
        };

        const messageStr = JSON.stringify(message);
        let sentCount = 0;

        for (const connectionId of subscribers) {
            const connection = this.connections.get(connectionId);
            if (connection && connection.ws.readyState === WebSocket.OPEN) {
                connection.ws.send(messageStr);
                sentCount++;
            }
        }

        if (sentCount > 0) {
            // console.log(`[Gateway] Broadcast frame ${frame.frameId} to ${sentCount} clients in room ${roomId}`);
        }
    }

    /**
     * 发送消息给客户端
     */
    private sendToClient(connection: ClientConnection, message: any): void {
        if (connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.send(JSON.stringify(message));
        }
    }

    /**
     * 订阅房间更新
     */
    private subscribeRoom(roomId: string, connectionId: string): void {
        if (!this.roomSubscriptions.has(roomId)) {
            this.roomSubscriptions.set(roomId, new Set());
        }
        this.roomSubscriptions.get(roomId)!.add(connectionId);
        console.log(`[Gateway] Connection ${connectionId} subscribed to room ${roomId}`);
    }

    /**
     * 取消订阅房间
     */
    private unsubscribeRoom(roomId: string, connectionId: string): void {
        const subs = this.roomSubscriptions.get(roomId);
        if (subs) {
            subs.delete(connectionId);
            if (subs.size === 0) {
                this.roomSubscriptions.delete(roomId);
            }
        }
    }

    /**
     * 连接断开
     */
    private handleDisconnect(connection: ClientConnection): void {
        console.log(`[Gateway] Connection ${connection.connectionId} disconnected`);

        // 取消所有房间订阅
        if (connection.roomId) {
            this.unsubscribeRoom(connection.roomId, connection.connectionId);
        }

        // 移除连接
        this.connections.delete(connection.connectionId);
    }

    /**
     * 停止 Gateway
     */
    async stop(): Promise<void> {
        console.log('[Gateway] Stopping...');

        this.isRunning = false;

        // 关闭所有 WebSocket 连接
        for (const connection of this.connections.values()) {
            connection.ws.close();
        }
        this.connections.clear();

        // 关闭服务器
        if (this.wsServer) {
            this.wsServer.close();
        }
        if (this.httpServer) {
            this.httpServer.close();
        }

        // 清理所有待处理的请求
        for (const [requestId, pending] of this.pendingRequests.entries()) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Gateway is shutting down'));
        }
        this.pendingRequests.clear();

        // 停止消息队列
        if (this.messageQueue) {
            this.messageQueue.stop();
        }

        // 断开 DragonflyDB
        await DragonflyClientManager.disconnect();

        console.log('[Gateway] ✅ Gateway stopped');
    }

    /**
     * 获取状态
     */
    getStatus() {
        return {
            gatewayId: this.config.gatewayId,
            isRunning: this.isRunning,
            connections: this.connections.size,
            pendingRequests: this.pendingRequests.size,
            subscribedRooms: this.roomSubscriptions.size,
            totalSubscribers: Array.from(this.roomSubscriptions.values()).reduce(
                (sum, subs) => sum + subs.size,
                0
            ),
        };
    }
}

// ============ 启动脚本 ============

async function main() {
    const config: GatewayConfig = {
        gatewayId: process.env.GATEWAY_ID || `gateway-${process.pid}`,
        port: parseInt(process.env.PORT || '3000', 10),
        dragonflyHost: process.env.DRAGONFLY_HOST || 'localhost',
        dragonflyPort: parseInt(process.env.DRAGONFLY_PORT || '6379', 10),
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '10000', 10),  // ⚡ 增加到 10秒（减少超时错误）
    };

    const gateway = new GatewayService(config);

    // 优雅退出
    process.on('SIGINT', async () => {
        console.log('\n[Gateway] Received SIGINT, shutting down...');
        await gateway.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n[Gateway] Received SIGTERM, shutting down...');
        await gateway.stop();
        process.exit(0);
    });

    try {
        await gateway.start();

        // 定期输出状态
        setInterval(() => {
            const status = gateway.getStatus();
            if (status.connections > 0) {
                console.log(`[Gateway] Status: ${status.connections} connections, ${status.subscribedRooms} rooms, ${status.totalSubscribers} subscribers`);
            }
        }, 30000);

    } catch (error: any) {
        console.error('[Gateway] Fatal error:', error);
        process.exit(1);
    }
}

// 如果直接运行此文件，则启动 Gateway
if (require.main === module) {
    main().catch(console.error);
}
