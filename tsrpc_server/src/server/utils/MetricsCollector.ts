/**
 * 📊 Prometheus Metrics 收集器
 *
 * 功能：
 * 1. API 性能指标（响应时间、请求数、错误率）
 * 2. 数据库性能指标（查询时间、连接数）
 * 3. 缓存性能指标（命中率、内存使用）
 * 4. 系统资源指标（CPU、内存、网络）
 * 5. 业务指标（在线用户、游戏房间数等）
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Logger } from './Logger';

export class MetricsCollector {
    private static registry: Registry;
    private static initialized = false;

    // ==================== API 性能指标 ====================

    /** API 请求总数 */
    static apiRequestsTotal: Counter<string>;

    /** API 响应时间分布 */
    static apiResponseTime: Histogram<string>;

    /** API 错误总数 */
    static apiErrorsTotal: Counter<string>;

    /** 当前并发请求数 */
    static apiConcurrentRequests: Gauge<string>;

    // ==================== 数据库指标 ====================

    /** 数据库查询总数 */
    static dbQueriesTotal: Counter<string>;

    /** 数据库查询时间分布 */
    static dbQueryDuration: Histogram<string>;

    /** 数据库错误总数 */
    static dbErrorsTotal: Counter<string>;

    /** 数据库连接池状态 */
    static dbConnectionPoolSize: Gauge<string>;

    // ==================== 缓存指标 ====================

    /** 缓存命中总数 */
    static cacheHitsTotal: Counter<string>;

    /** 缓存未命中总数 */
    static cacheMissesTotal: Counter<string>;

    /** 缓存写入总数 */
    static cacheSetsTotal: Counter<string>;

    /** 内存缓存大小 */
    static memoryCacheSize: Gauge<string>;

    /** 缓存操作时间 */
    static cacheOperationDuration: Histogram<string>;

    // ==================== 业务指标 ====================

    /** 在线用户数 */
    static onlineUsers: Gauge<string>;

    /** 活跃游戏房间数 */
    static activeRooms: Gauge<string>;

    /** 用户登录总数 */
    static userLoginsTotal: Counter<string>;

    /** 游戏开始总数 */
    static gameStartsTotal: Counter<string>;

    /** 交易总金额 */
    static transactionAmount: Counter<string>;

    // ==================== 系统资源指标 ====================

    /** Node.js 进程信息（由 collectDefaultMetrics 自动收集） */
    // - process_cpu_user_seconds_total
    // - process_cpu_system_seconds_total
    // - process_resident_memory_bytes
    // - process_heap_bytes
    // - nodejs_eventloop_lag_seconds
    // - nodejs_active_handles_total
    // - nodejs_active_requests_total

    /**
     * 初始化 Metrics 收集器
     */
    static init(): void {
        if (this.initialized) {
            Logger.warn('MetricsCollector already initialized');
            return;
        }

        try {
            // 创建注册表
            this.registry = new Registry();

            // 设置默认标签
            this.registry.setDefaultLabels({
                app: 'coin-pusher-game',
                env: process.env.NODE_ENV || 'development',
            });

            // 启用默认指标（CPU、内存、事件循环等）
            collectDefaultMetrics({
                register: this.registry,
                prefix: 'nodejs_',
                gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
            });

            // 初始化 API 指标
            this.initApiMetrics();

            // 初始化数据库指标
            this.initDatabaseMetrics();

            // 初始化缓存指标
            this.initCacheMetrics();

            // 初始化业务指标
            this.initBusinessMetrics();

            this.initialized = true;
            Logger.info('MetricsCollector initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize MetricsCollector', {}, error);
            throw error;
        }
    }

    /**
     * 初始化 API 指标
     */
    private static initApiMetrics(): void {
        // API 请求总数
        this.apiRequestsTotal = new Counter({
            name: 'api_requests_total',
            help: 'Total number of API requests',
            labelNames: ['method', 'endpoint', 'status'],
            registers: [this.registry],
        });

        // API 响应时间
        this.apiResponseTime = new Histogram({
            name: 'api_response_time_seconds',
            help: 'API response time in seconds',
            labelNames: ['method', 'endpoint'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
            registers: [this.registry],
        });

        // API 错误总数
        this.apiErrorsTotal = new Counter({
            name: 'api_errors_total',
            help: 'Total number of API errors',
            labelNames: ['method', 'endpoint', 'error_type'],
            registers: [this.registry],
        });

        // 并发请求数
        this.apiConcurrentRequests = new Gauge({
            name: 'api_concurrent_requests',
            help: 'Number of concurrent API requests',
            labelNames: ['endpoint'],
            registers: [this.registry],
        });
    }

    /**
     * 初始化数据库指标
     */
    private static initDatabaseMetrics(): void {
        // 数据库查询总数
        this.dbQueriesTotal = new Counter({
            name: 'db_queries_total',
            help: 'Total number of database queries',
            labelNames: ['operation', 'collection'],
            registers: [this.registry],
        });

        // 数据库查询时间
        this.dbQueryDuration = new Histogram({
            name: 'db_query_duration_seconds',
            help: 'Database query duration in seconds',
            labelNames: ['operation', 'collection'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
            registers: [this.registry],
        });

        // 数据库错误
        this.dbErrorsTotal = new Counter({
            name: 'db_errors_total',
            help: 'Total number of database errors',
            labelNames: ['operation', 'collection', 'error_type'],
            registers: [this.registry],
        });

        // 连接池大小
        this.dbConnectionPoolSize = new Gauge({
            name: 'db_connection_pool_size',
            help: 'Database connection pool size',
            labelNames: ['state'],
            registers: [this.registry],
        });
    }

    /**
     * 初始化缓存指标
     */
    private static initCacheMetrics(): void {
        // 缓存命中
        this.cacheHitsTotal = new Counter({
            name: 'cache_hits_total',
            help: 'Total number of cache hits',
            labelNames: ['cache_type', 'key_prefix'],
            registers: [this.registry],
        });

        // 缓存未命中
        this.cacheMissesTotal = new Counter({
            name: 'cache_misses_total',
            help: 'Total number of cache misses',
            labelNames: ['cache_type', 'key_prefix'],
            registers: [this.registry],
        });

        // 缓存写入
        this.cacheSetsTotal = new Counter({
            name: 'cache_sets_total',
            help: 'Total number of cache sets',
            labelNames: ['cache_type', 'key_prefix'],
            registers: [this.registry],
        });

        // 内存缓存大小
        this.memoryCacheSize = new Gauge({
            name: 'memory_cache_size',
            help: 'Number of items in memory cache',
            registers: [this.registry],
        });

        // 缓存操作时间
        this.cacheOperationDuration = new Histogram({
            name: 'cache_operation_duration_seconds',
            help: 'Cache operation duration in seconds',
            labelNames: ['operation', 'cache_type'],
            buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
            registers: [this.registry],
        });
    }

    /**
     * 初始化业务指标
     */
    private static initBusinessMetrics(): void {
        // 在线用户数
        this.onlineUsers = new Gauge({
            name: 'online_users',
            help: 'Number of online users',
            registers: [this.registry],
        });

        // 活跃房间数
        this.activeRooms = new Gauge({
            name: 'active_rooms',
            help: 'Number of active game rooms',
            registers: [this.registry],
        });

        // 用户登录
        this.userLoginsTotal = new Counter({
            name: 'user_logins_total',
            help: 'Total number of user logins',
            labelNames: ['status'],
            registers: [this.registry],
        });

        // 游戏开始
        this.gameStartsTotal = new Counter({
            name: 'game_starts_total',
            help: 'Total number of game starts',
            labelNames: ['game_mode'],
            registers: [this.registry],
        });

        // 交易金额
        this.transactionAmount = new Counter({
            name: 'transaction_amount_total',
            help: 'Total transaction amount',
            labelNames: ['currency_type'],
            registers: [this.registry],
        });
    }

    /**
     * 获取所有指标（Prometheus 格式）
     */
    static async getMetrics(): Promise<string> {
        if (!this.initialized) {
            throw new Error('MetricsCollector not initialized');
        }
        return await this.registry.metrics();
    }

    /**
     * 获取内容类型
     */
    static getContentType(): string {
        return this.registry.contentType;
    }

    /**
     * 重置所有指标（仅用于测试）
     */
    static reset(): void {
        if (this.registry) {
            this.registry.clear();
        }
        this.initialized = false;
    }
}

// ==================== 辅助函数 ====================

/**
 * 记录 API 请求
 */
export function recordApiRequest(
    method: string,
    endpoint: string,
    status: string,
    durationSeconds: number
): void {
    if (!MetricsCollector.apiRequestsTotal) return;

    MetricsCollector.apiRequestsTotal.inc({ method, endpoint, status });
    MetricsCollector.apiResponseTime.observe({ method, endpoint }, durationSeconds);
}

/**
 * 记录 API 错误
 */
export function recordApiError(method: string, endpoint: string, errorType: string): void {
    if (!MetricsCollector.apiErrorsTotal) return;

    MetricsCollector.apiErrorsTotal.inc({ method, endpoint, error_type: errorType });
}

/**
 * 记录数据库查询
 */
export function recordDbQuery(
    operation: string,
    collection: string,
    durationSeconds: number
): void {
    if (!MetricsCollector.dbQueriesTotal) return;

    MetricsCollector.dbQueriesTotal.inc({ operation, collection });
    MetricsCollector.dbQueryDuration.observe({ operation, collection }, durationSeconds);
}

/**
 * 记录数据库错误
 */
export function recordDbError(operation: string, collection: string, errorType: string): void {
    if (!MetricsCollector.dbErrorsTotal) return;

    MetricsCollector.dbErrorsTotal.inc({ operation, collection, error_type: errorType });
}

/**
 * 记录缓存命中
 */
export function recordCacheHit(cacheType: 'memory' | 'redis', keyPrefix: string): void {
    if (!MetricsCollector.cacheHitsTotal) return;

    MetricsCollector.cacheHitsTotal.inc({ cache_type: cacheType, key_prefix: keyPrefix });
}

/**
 * 记录缓存未命中
 */
export function recordCacheMiss(cacheType: 'memory' | 'redis', keyPrefix: string): void {
    if (!MetricsCollector.cacheMissesTotal) return;

    MetricsCollector.cacheMissesTotal.inc({ cache_type: cacheType, key_prefix: keyPrefix });
}

/**
 * 记录缓存写入
 */
export function recordCacheSet(cacheType: 'memory' | 'redis', keyPrefix: string): void {
    if (!MetricsCollector.cacheSetsTotal) return;

    MetricsCollector.cacheSetsTotal.inc({ cache_type: cacheType, key_prefix: keyPrefix });
}

/**
 * 更新在线用户数
 */
export function updateOnlineUsers(count: number): void {
    if (!MetricsCollector.onlineUsers) return;

    MetricsCollector.onlineUsers.set(count);
}

/**
 * 更新活跃房间数
 */
export function updateActiveRooms(count: number): void {
    if (!MetricsCollector.activeRooms) return;

    MetricsCollector.activeRooms.set(count);
}

/**
 * API 计时器（自动记录响应时间）
 */
export class ApiTimer {
    private startTime: number;
    private method: string;
    private endpoint: string;

    constructor(method: string, endpoint: string) {
        this.method = method;
        this.endpoint = endpoint;
        this.startTime = Date.now();

        // 增加并发请求计数
        if (MetricsCollector.apiConcurrentRequests) {
            MetricsCollector.apiConcurrentRequests.inc({ endpoint });
        }
    }

    /**
     * 结束计时并记录指标
     */
    end(status: 'success' | 'error' = 'success'): void {
        const duration = (Date.now() - this.startTime) / 1000;

        // 记录请求
        recordApiRequest(this.method, this.endpoint, status, duration);

        // 减少并发请求计数
        if (MetricsCollector.apiConcurrentRequests) {
            MetricsCollector.apiConcurrentRequests.dec({ endpoint: this.endpoint });
        }
    }
}

/**
 * 数据库计时器
 */
export class DbTimer {
    private startTime: number;
    private operation: string;
    private collection: string;

    constructor(operation: string, collection: string) {
        this.operation = operation;
        this.collection = collection;
        this.startTime = Date.now();
    }

    /**
     * 结束计时并记录指标
     */
    end(): void {
        const duration = (Date.now() - this.startTime) / 1000;
        recordDbQuery(this.operation, this.collection, duration);
    }
}
