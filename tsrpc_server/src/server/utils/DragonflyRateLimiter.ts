/**
 * 🐉 DragonflyDB 分布式限流器
 *
 * DragonflyDB优势:
 * - 性能是Redis的25倍（单核）
 * - 内存效率提升30%
 * - 完全兼容Redis协议
 * - 更快的快照和复制
 *
 * 支持算法:
 * 1. 滑动窗口 (Sliding Window)
 * 2. Token Bucket
 * 3. 漏桶 (Leaky Bucket)
 */

import Redis from 'ioredis';

export interface RateLimitResult {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    resetAt: number;      // Unix timestamp (ms)
    retryAfter?: number;  // 秒数
}

export interface DragonflyConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
    // DragonflyDB特有优化
    enableReadyCheck?: boolean;
    maxRetriesPerRequest?: number;
}

/**
 * 分布式限流器基类
 */
export abstract class BaseDragonflyLimiter {
    protected client: Redis;
    protected keyPrefix: string;

    constructor(client: Redis, name: string) {
        this.client = client;
        this.keyPrefix = `limiter:${name}:`;
    }

    protected getKey(identifier: string): string {
        return this.keyPrefix + identifier;
    }

    /**
     * 获取当前使用量（不消费配额）
     */
    abstract peek(identifier: string): Promise<RateLimitResult>;

    /**
     * 尝试消费配额
     */
    abstract tryAcquire(identifier: string): Promise<RateLimitResult>;

    /**
     * 重置配额
     */
    abstract reset(identifier: string): Promise<void>;
}

/**
 * 滑动窗口限流器 - 推荐用于API限流
 *
 * 优点：精确控制时间窗口内的请求数
 * 适用场景：投币限流、API调用限流
 */
export class SlidingWindowLimiter extends BaseDragonflyLimiter {
    private maxRequests: number;
    private windowMs: number;

    constructor(
        client: Redis,
        name: string,
        maxRequests: number,
        windowMs: number
    ) {
        super(client, name);
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    async peek(identifier: string): Promise<RateLimitResult> {
        const key = this.getKey(identifier);
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // 获取窗口内的请求数
        const current = await this.client.zcount(key, windowStart, '+inf');

        // 获取最旧的请求时间
        const oldest = await this.client.zrange(key, 0, 0, 'WITHSCORES');
        let resetAt = now + this.windowMs;
        if (oldest.length >= 2) {
            const oldestTimestamp = parseInt(oldest[1]);
            resetAt = oldestTimestamp + this.windowMs;
        }

        return {
            allowed: current < this.maxRequests,
            current,
            limit: this.maxRequests,
            remaining: Math.max(0, this.maxRequests - current),
            resetAt,
            retryAfter: current >= this.maxRequests
                ? Math.ceil((resetAt - now) / 1000)
                : undefined
        };
    }

    async tryAcquire(identifier: string): Promise<RateLimitResult> {
        const key = this.getKey(identifier);
        const now = Date.now();
        const windowStart = now - this.windowMs;

        const seqKey = `${key}:seq`;

        // Lua脚本保证原子性
        const script = `
            local key = KEYS[1]
            local seq_key = KEYS[2]
            local now = tonumber(ARGV[1])
            local window_start = tonumber(ARGV[2])
            local max_requests = tonumber(ARGV[3])
            local window_ms = tonumber(ARGV[4])
            local ttl_seconds = tonumber(ARGV[5])

            -- 清理过期记录
            redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

            -- 获取当前计数
            local current = redis.call('ZCARD', key)

            -- 获取最旧请求时间（用于计算resetAt）
            local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
            local reset_at = now + window_ms
            if #oldest >= 2 then
                reset_at = tonumber(oldest[2]) + window_ms
            end

            if current < max_requests then
                -- 允许请求，记录时间戳，member 需要唯一以避免同毫秒覆盖
                redis.call('SET', seq_key, 0, 'NX')  -- 确保序列键存在，避免 Dragonfly undeclared key 报错
                local seq = redis.call('INCR', seq_key)
                local member = tostring(now) .. ':' .. tostring(seq)
                redis.call('ZADD', key, now, member)
                redis.call('EXPIRE', key, ttl_seconds)
                redis.call('EXPIRE', seq_key, ttl_seconds)
                return {1, current + 1, max_requests, max_requests - current - 1, reset_at}
            else
                -- 拒绝请求
                return {0, current, max_requests, 0, reset_at}
            end
        `;

        const ttlSeconds = Math.ceil(this.windowMs / 1000) + 10; // 加10秒buffer

        const result = await this.client.eval(
            script,
            2,
            key,
            seqKey,
            now.toString(),
            windowStart.toString(),
            this.maxRequests.toString(),
            this.windowMs.toString(),
            ttlSeconds.toString()
        ) as [number, number, number, number, number];

        const allowed = result[0] === 1;
        const current = result[1];
        const limit = result[2];
        const remaining = result[3];
        const resetAt = result[4];

        return {
            allowed,
            current,
            limit,
            remaining,
            resetAt,
            retryAfter: !allowed ? Math.ceil((resetAt - now) / 1000) : undefined
        };
    }

    async reset(identifier: string): Promise<void> {
        const key = this.getKey(identifier);
        await this.client.del(key);
    }
}

/**
 * Token Bucket限流器 - 推荐用于平滑限流
 *
 * 优点：允许突发流量，平滑消费
 * 适用场景：长连接消息发送、突发API调用
 */
export class TokenBucketLimiter extends BaseDragonflyLimiter {
    private capacity: number;        // 桶容量
    private refillRate: number;      // 每秒补充token数
    private refillInterval: number;  // 补充间隔（ms）

    constructor(
        client: Redis,
        name: string,
        capacity: number,
        refillRate: number,
        refillInterval: number = 1000
    ) {
        super(client, name);
        this.capacity = capacity;
        this.refillRate = refillRate;
        this.refillInterval = refillInterval;
    }

    async peek(identifier: string): Promise<RateLimitResult> {
        const key = this.getKey(identifier);
        const now = Date.now();

        const data = await this.client.hgetall(key);
        let tokens = parseFloat(data.tokens || this.capacity.toString());
        const lastRefill = parseInt(data.last_refill || now.toString());

        // 计算应补充的token
        const elapsed = now - lastRefill;
        const refillTokens = (elapsed / this.refillInterval) * this.refillRate;
        tokens = Math.min(this.capacity, tokens + refillTokens);

        const resetAt = tokens >= 1
            ? now
            : now + Math.ceil((1 - tokens) / this.refillRate * this.refillInterval);

        return {
            allowed: tokens >= 1,
            current: this.capacity - Math.floor(tokens),
            limit: this.capacity,
            remaining: Math.floor(tokens),
            resetAt,
            retryAfter: tokens < 1 ? Math.ceil((resetAt - now) / 1000) : undefined
        };
    }

    async tryAcquire(identifier: string, cost: number = 1): Promise<RateLimitResult> {
        const key = this.getKey(identifier);
        const now = Date.now();

        const script = `
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local capacity = tonumber(ARGV[2])
            local refill_rate = tonumber(ARGV[3])
            local refill_interval = tonumber(ARGV[4])
            local cost = tonumber(ARGV[5])
            local ttl_seconds = tonumber(ARGV[6])

            -- 获取当前状态
            local tokens = tonumber(redis.call('HGET', key, 'tokens') or capacity)
            local last_refill = tonumber(redis.call('HGET', key, 'last_refill') or now)

            -- 计算补充的token
            local elapsed = now - last_refill
            local refill_tokens = (elapsed / refill_interval) * refill_rate
            tokens = math.min(capacity, tokens + refill_tokens)

            -- 尝试消费
            if tokens >= cost then
                tokens = tokens - cost
                redis.call('HSET', key, 'tokens', tokens)
                redis.call('HSET', key, 'last_refill', now)
                redis.call('EXPIRE', key, ttl_seconds)

                -- 计算重置时间
                local reset_at = tokens >= 1 and now or (now + math.ceil((1 - tokens) / refill_rate * refill_interval))

                return {1, capacity - math.floor(tokens), capacity, math.floor(tokens), reset_at}
            else
                -- 拒绝，计算何时有足够token
                local needed = cost - tokens
                local wait_ms = math.ceil(needed / refill_rate * refill_interval)
                local reset_at = now + wait_ms

                return {0, capacity - math.floor(tokens), capacity, math.floor(tokens), reset_at}
            end
        `;

        const ttlSeconds = 3600; // 1小时

        const result = await this.client.eval(
            script,
            1,
            key,
            now.toString(),
            this.capacity.toString(),
            this.refillRate.toString(),
            this.refillInterval.toString(),
            cost.toString(),
            ttlSeconds.toString()
        ) as [number, number, number, number, number];

        const allowed = result[0] === 1;
        const current = result[1];
        const limit = result[2];
        const remaining = result[3];
        const resetAt = result[4];

        return {
            allowed,
            current,
            limit,
            remaining,
            resetAt,
            retryAfter: !allowed ? Math.ceil((resetAt - now) / 1000) : undefined
        };
    }

    async reset(identifier: string): Promise<void> {
        const key = this.getKey(identifier);
        await this.client.del(key);
    }
}

/**
 * 漏桶限流器 - 推荐用于流量整形
 *
 * 优点：强制恒定速率，平滑输出
 * 适用场景：第三方API调用、消息队列
 */
export class LeakyBucketLimiter extends BaseDragonflyLimiter {
    private capacity: number;
    private leakRate: number; // 每秒漏出的请求数

    constructor(
        client: Redis,
        name: string,
        capacity: number,
        leakRate: number
    ) {
        super(client, name);
        this.capacity = capacity;
        this.leakRate = leakRate;
    }

    async peek(identifier: string): Promise<RateLimitResult> {
        const key = this.getKey(identifier);
        const now = Date.now();

        const data = await this.client.hgetall(key);
        let water = parseFloat(data.water || '0');
        const lastLeak = parseInt(data.last_leak || now.toString());

        // 计算漏出的水
        const elapsed = now - lastLeak;
        const leaked = (elapsed / 1000) * this.leakRate;
        water = Math.max(0, water - leaked);

        const resetAt = water > 0
            ? now + Math.ceil((water / this.leakRate) * 1000)
            : now;

        return {
            allowed: water < this.capacity,
            current: Math.ceil(water),
            limit: this.capacity,
            remaining: Math.floor(this.capacity - water),
            resetAt,
            retryAfter: water >= this.capacity ? Math.ceil((resetAt - now) / 1000) : undefined
        };
    }

    async tryAcquire(identifier: string): Promise<RateLimitResult> {
        const key = this.getKey(identifier);
        const now = Date.now();

        const script = `
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local capacity = tonumber(ARGV[2])
            local leak_rate = tonumber(ARGV[3])
            local ttl_seconds = tonumber(ARGV[4])

            -- 获取当前状态
            local water = tonumber(redis.call('HGET', key, 'water') or 0)
            local last_leak = tonumber(redis.call('HGET', key, 'last_leak') or now)

            -- 计算漏出的水
            local elapsed = now - last_leak
            local leaked = (elapsed / 1000) * leak_rate
            water = math.max(0, water - leaked)

            -- 尝试加水（先判断加1是否会超出容量）
            if (water + 1) <= capacity then
                water = water + 1
                redis.call('HSET', key, 'water', water)
                redis.call('HSET', key, 'last_leak', now)
                redis.call('EXPIRE', key, ttl_seconds)

                local reset_at = water > 0 and (now + math.ceil((water / leak_rate) * 1000)) or now

                return {1, math.ceil(water), capacity, math.floor(capacity - water), reset_at}
            else
                -- 桶满，拒绝
                local reset_at = now + math.ceil((water / leak_rate) * 1000)
                return {0, math.ceil(water), capacity, 0, reset_at}
            end
        `;

        const ttlSeconds = Math.ceil(this.capacity / this.leakRate) + 10;

        const result = await this.client.eval(
            script,
            1,
            key,
            now.toString(),
            this.capacity.toString(),
            this.leakRate.toString(),
            ttlSeconds.toString()
        ) as [number, number, number, number, number];

        const allowed = result[0] === 1;
        const current = result[1];
        const limit = result[2];
        const remaining = result[3];
        const resetAt = result[4];

        return {
            allowed,
            current,
            limit,
            remaining,
            resetAt,
            retryAfter: !allowed ? Math.ceil((resetAt - now) / 1000) : undefined
        };
    }

    async reset(identifier: string): Promise<void> {
        const key = this.getKey(identifier);
        await this.client.del(key);
    }
}

/**
 * DragonflyDB客户端管理器
 */
export class DragonflyClientManager {
    private static instance: Redis;

    static initialize(config: DragonflyConfig): Redis {
        if (this.instance) {
            return this.instance;
        }

        this.instance = new Redis({
            host: config.host,
            port: config.port,
            password: config.password,
            db: config.db || 0,

            // DragonflyDB优化配置
            enableReadyCheck: config.enableReadyCheck ?? true,
            maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,

            // 连接池配置
            lazyConnect: false,
            keepAlive: 30000,

            // 重连策略
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                console.log(`[DragonflyDB] Retrying connection... (${times})`);
                return delay;
            },

            // 事件监听
            enableOfflineQueue: true,
        });

        this.instance.on('connect', () => {
            console.log('[DragonflyDB] Connected');
        });

        this.instance.on('error', (err) => {
            console.error('[DragonflyDB] Error:', err);
        });

        this.instance.on('close', () => {
            console.warn('[DragonflyDB] Connection closed');
        });

        return this.instance;
    }

    static getClient(): Redis {
        if (!this.instance) {
            throw new Error('DragonflyDB client not initialized. Call initialize() first.');
        }
        return this.instance;
    }

    static async disconnect(): Promise<void> {
        if (this.instance) {
            await this.instance.quit();
            this.instance = null as any;
        }
    }

    /**
     * 健康检查
     */
    static async healthCheck(): Promise<{
        connected: boolean;
        latency?: number;
        version?: string;
    }> {
        if (!this.instance) {
            return { connected: false };
        }

        try {
            const start = Date.now();
            await this.instance.ping();
            const latency = Date.now() - start;

            const info = await this.instance.info('server');
            const versionMatch = info.match(/dragonfly_version:(.+)/);
            const version = versionMatch ? versionMatch[1].trim() : 'unknown';

            return { connected: true, latency, version };
        } catch (err) {
            return { connected: false };
        }
    }
}
