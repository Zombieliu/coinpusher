/**
 * 🔄 消息队列基础设施
 *
 * 基于 DragonflyDB Stream 实现的消息队列
 * 支持生产者-消费者模式和发布-订阅模式
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';

// ============ 消息类型定义 ============

/**
 * 物理请求消息
 */
export interface PhysicsRequest {
    requestId: string;      // 请求ID（用于响应匹配）
    roomId: string;         // 房间ID
    userId: string;         // 用户ID
    action: string;         // 操作类型
    payload: any;           // 操作参数
    timestamp: number;      // 时间戳
}

/**
 * 物理响应消息
 */
export interface PhysicsResponse {
    requestId: string;      // 对应的请求ID
    roomId: string;
    success: boolean;
    data?: any;             // 结果数据
    error?: string;         // 错误信息
    timestamp: number;
}

/**
 * 物理帧广播
 */
export interface PhysicsFrame {
    roomId: string;
    frameId: number;
    timestamp: number;
    coins: Array<{
        id: number;
        x: number;
        y: number;
        z: number;
        rotation?: { x: number; y: number; z: number; w: number };
    }>;
    collected: number[];    // 被收集的硬币ID
    removed: number[];      // 被移除的硬币ID
}

// ============ Stream 配置 ============

export const STREAM_NAMES = {
    PHYSICS_REQUESTS: 'physics:requests',
    PHYSICS_RESPONSES: 'physics:responses',
    PHYSICS_BROADCAST: 'physics:broadcast',
    WORKER_HEARTBEAT: 'worker:heartbeat',
};

export const CONSUMER_GROUPS = {
    PHYSICS_WORKERS: 'physics-workers',
    GATEWAYS: 'gateways',
};

// ============ 消息队列类 ============

/**
 * 消息队列管理器
 */
export class MessageQueue extends EventEmitter {
    private client: Redis;
    private consumerId: string;
    private isRunning: boolean = false;
    private consumerLoops: Map<string, NodeJS.Timeout> = new Map();

    constructor(client: Redis, consumerId: string) {
        super();
        this.client = client;
        this.consumerId = consumerId;
    }

    // ============ 生产者方法 ============

    /**
     * 发布物理请求
     */
    async publishPhysicsRequest(request: PhysicsRequest): Promise<string> {
        const msgId = await this.client.xadd(
            STREAM_NAMES.PHYSICS_REQUESTS,
            'MAXLEN', '~', '10000',  // 保留最近 10000 条消息
            '*',
            'data', JSON.stringify(request)
        );
        return msgId;
    }

    /**
     * 发布物理响应
     */
    async publishPhysicsResponse(response: PhysicsResponse): Promise<string> {
        const msgId = await this.client.xadd(
            STREAM_NAMES.PHYSICS_RESPONSES,
            'MAXLEN', '~', '10000',
            '*',
            'data', JSON.stringify(response)
        );
        return msgId;
    }

    /**
     * 广播物理帧
     */
    async broadcastPhysicsFrame(frame: PhysicsFrame): Promise<string> {
        const msgId = await this.client.xadd(
            STREAM_NAMES.PHYSICS_BROADCAST,
            'MAXLEN', '~', '1000',  // 只保留最近 1000 帧
            '*',
            'data', JSON.stringify(frame)
        );
        return msgId;
    }

    /**
     * 发送 Worker 心跳
     */
    async sendWorkerHeartbeat(workerId: string, rooms: string[]): Promise<string> {
        const heartbeat = {
            workerId,
            rooms,
            timestamp: Date.now(),
        };
        const msgId = await this.client.xadd(
            STREAM_NAMES.WORKER_HEARTBEAT,
            'MAXLEN', '~', '100',
            '*',
            'data', JSON.stringify(heartbeat)
        );
        return msgId;
    }

    // ============ 消费者方法 ============

    /**
     * 确保消费组存在
     */
    private async ensureConsumerGroup(streamName: string, groupName: string): Promise<void> {
        try {
            await this.client.xgroup(
                'CREATE',
                streamName,
                groupName,
                '$',  // 从最新消息开始
                'MKSTREAM'
            );
            console.log(`[MQ] Created consumer group: ${groupName} on stream: ${streamName}`);
        } catch (error: any) {
            // BUSYGROUP 错误表示组已存在，可以忽略
            if (!error.message.includes('BUSYGROUP')) {
                throw error;
            }
        }
    }

    /**
     * 消费物理请求（Physics Worker 使用）
     */
    async consumePhysicsRequests(
        handler: (request: PhysicsRequest, msgId: string) => Promise<void>
    ): Promise<void> {
        const streamName = STREAM_NAMES.PHYSICS_REQUESTS;
        const groupName = CONSUMER_GROUPS.PHYSICS_WORKERS;

        await this.ensureConsumerGroup(streamName, groupName);

        this.isRunning = true;
        this.startConsumerLoop(streamName, groupName, async (messages) => {
            // ⚡ 并行处理所有消息（性能优化）
            await Promise.allSettled(
                messages.map(async ([msgId, fields]) => {
                    try {
                        const data = this.parseStreamFields(fields);
                        const request: PhysicsRequest = JSON.parse(data.data);

                        await handler(request, msgId);

                        // 确认消息
                        await this.client.xack(streamName, groupName, msgId);
                    } catch (error: any) {
                        console.error(`[MQ] Error processing request ${msgId}:`, error.message);
                        // 不确认消息，它会被重新投递
                    }
                })
            );
        });
    }

    /**
     * 消费物理响应（Gateway 使用）
     */
    async consumePhysicsResponses(
        handler: (response: PhysicsResponse, msgId: string) => Promise<void>
    ): Promise<void> {
        const streamName = STREAM_NAMES.PHYSICS_RESPONSES;
        const groupName = CONSUMER_GROUPS.GATEWAYS;

        await this.ensureConsumerGroup(streamName, groupName);

        this.isRunning = true;
        this.startConsumerLoop(streamName, groupName, async (messages) => {
            // ⚡ 并行处理所有消息（性能优化）
            await Promise.allSettled(
                messages.map(async ([msgId, fields]) => {
                    try {
                        const data = this.parseStreamFields(fields);
                        const response: PhysicsResponse = JSON.parse(data.data);

                        await handler(response, msgId);

                        // 确认消息
                        await this.client.xack(streamName, groupName, msgId);
                    } catch (error: any) {
                        console.error(`[MQ] Error processing response ${msgId}:`, error.message);
                    }
                })
            );
        });
    }

    /**
     * 订阅物理帧广播（Gateway 使用）
     */
    async subscribePhysicsFrames(
        handler: (frame: PhysicsFrame) => Promise<void>
    ): Promise<void> {
        let lastId = '$';  // 从最新消息开始
        this.isRunning = true;

        const loop = async () => {
            while (this.isRunning) {
                try {
                    const result = await this.client.xread(
                        'BLOCK', '1000',  // 阻塞 1 秒
                        'STREAMS',
                        STREAM_NAMES.PHYSICS_BROADCAST,
                        lastId
                    );

                    if (result) {
                        const [streamName, messages] = result[0];
                        for (const [msgId, fields] of messages) {
                            const data = this.parseStreamFields(fields);
                            const frame: PhysicsFrame = JSON.parse(data.data);
                            await handler(frame);
                            lastId = msgId;
                        }
                    }
                } catch (error: any) {
                    console.error('[MQ] Error subscribing to frames:', error.message);
                    await this.sleep(1000);
                }
            }
        };

        loop();
    }

    // ============ 辅助方法 ============

    /**
     * 启动消费者循环
     */
    private startConsumerLoop(
        streamName: string,
        groupName: string,
        handler: (messages: any[]) => Promise<void>
    ): void {
        const loop = async () => {
            while (this.isRunning) {
                try {
                    // XREADGROUP 阻塞读取
                    const result = await this.client.xreadgroup(
                        'GROUP', groupName, this.consumerId,
                        'BLOCK', '500',   // 阻塞 500ms（更快响应）
                        'COUNT', '50',    // ⚡ 每次最多读取 50 条（性能优化）
                        'STREAMS',
                        streamName,
                        '>'  // 读取未确认的新消息
                    ) as any;

                    if (result) {
                        const [stream, messages] = result[0] as any;
                        await handler(messages);
                    }
                } catch (error: any) {
                    console.error(`[MQ] Consumer loop error on ${streamName}:`, error.message);
                    await this.sleep(1000);
                }
            }
        };

        loop();
    }

    /**
     * 解析 Stream 字段
     */
    private parseStreamFields(fields: string[]): Record<string, string> {
        const result: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
            result[fields[i]] = fields[i + 1];
        }
        return result;
    }

    /**
     * Sleep 辅助函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 停止消费
     */
    stop(): void {
        this.isRunning = false;
        this.consumerLoops.forEach(timer => clearTimeout(timer));
        this.consumerLoops.clear();
    }

    /**
     * 关闭连接
     */
    async close(): Promise<void> {
        this.stop();
        // 不关闭 client，因为它可能被其他地方使用
    }
}

// ============ 工厂函数 ============

/**
 * 创建消息队列实例
 */
export function createMessageQueue(
    redisOptions: { host: string; port: number },
    consumerId: string
): MessageQueue {
    const client = new Redis(redisOptions);
    return new MessageQueue(client, consumerId);
}
