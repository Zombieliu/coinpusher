/**
 * 📊 Prometheus 监控指标
 *
 * 集成 prom-client，提供完整的业务和系统指标
 */

import { register, Counter, Histogram, Gauge, Summary, collectDefaultMetrics } from 'prom-client';
import express from 'express';

/**
 * 初始化Prometheus指标收集
 */
export function initializeMetrics() {
    // 收集默认系统指标（CPU、内存、GC等）
    collectDefaultMetrics({
        prefix: 'coinpusher_',
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    console.log('[Prometheus] Metrics initialized');
}

/**
 * 业务指标
 */
export const Metrics = {
    // ===== 投币相关 =====
    dropCoinTotal: new Counter({
        name: 'drop_coin_total',
        help: 'Total drop coin requests',
        labelNames: ['userId', 'success', 'reason']
    }),

    dropCoinDuration: new Histogram({
        name: 'drop_coin_duration_seconds',
        help: 'Drop coin request duration',
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
    }),

    dropCoinInFlight: new Gauge({
        name: 'drop_coin_in_flight',
        help: 'Number of drop coin requests currently processing'
    }),

    // ===== 奖励相关 =====
    rewardGiven: new Counter({
        name: 'reward_given_total',
        help: 'Total rewards given to users'
    }),

    rewardAmount: new Counter({
        name: 'reward_amount_total',
        help: 'Total reward amount (gold)'
    }),

    dailyLimitHits: new Counter({
        name: 'daily_limit_hits_total',
        help: 'Times users hit their daily reward limit',
        labelNames: ['userId']
    }),

    dailyLimitRemaining: new Gauge({
        name: 'daily_limit_remaining',
        help: 'Remaining daily reward quota',
        labelNames: ['userId']
    }),

    // ===== 限流相关 =====
    rateLimitChecks: new Counter({
        name: 'rate_limit_checks_total',
        help: 'Total rate limit checks',
        labelNames: ['limiter', 'result']  // result: allowed, denied
    }),

    rateLimitHits: new Counter({
        name: 'rate_limit_hits_total',
        help: 'Times rate limit was hit',
        labelNames: ['limiter', 'userId']
    }),

    rateLimitCurrent: new Gauge({
        name: 'rate_limit_current',
        help: 'Current rate limit usage',
        labelNames: ['limiter', 'userId']
    }),

    // ===== 安全相关 =====
    fraudScores: new Histogram({
        name: 'fraud_score',
        help: 'Fraud detection scores',
        labelNames: ['userId'],
        buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    }),

    fraudActions: new Counter({
        name: 'fraud_actions_total',
        help: 'Fraud detection actions taken',
        labelNames: ['action'] // action: none, watch, restrict, ban
    }),

    bannedUsers: new Gauge({
        name: 'banned_users_total',
        help: 'Total number of banned users'
    }),

    restrictedUsers: new Gauge({
        name: 'restricted_users_total',
        help: 'Total number of restricted users'
    }),

    suspiciousLogins: new Counter({
        name: 'suspicious_logins_total',
        help: 'Suspicious login attempts detected',
        labelNames: ['reason'] // reason: same_device, same_ip, same_wallet
    }),

    deviceFingerprints: new Gauge({
        name: 'device_fingerprints_total',
        help: 'Total unique device fingerprints'
    }),

    // ===== 交易相关 =====
    transactionTotal: new Counter({
        name: 'transaction_total',
        help: 'Total transactions',
        labelNames: ['type', 'success'] // type: deduct, add
    }),

    transactionDuration: new Histogram({
        name: 'transaction_duration_seconds',
        help: 'Transaction processing duration',
        labelNames: ['type'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    }),

    transactionAmount: new Summary({
        name: 'transaction_amount',
        help: 'Transaction amount distribution',
        labelNames: ['type'],
        percentiles: [0.5, 0.9, 0.95, 0.99]
    }),

    duplicateTransactions: new Counter({
        name: 'duplicate_transactions_total',
        help: 'Duplicate transaction attempts (idempotency)'
    }),

    // ===== 房间/游戏相关 =====
    activeRooms: new Gauge({
        name: 'active_rooms',
        help: 'Number of active game rooms'
    }),

    activeUsers: new Gauge({
        name: 'active_users',
        help: 'Number of active users'
    }),

    roomCreations: new Counter({
        name: 'room_creations_total',
        help: 'Total room creations'
    }),

    roomDuration: new Histogram({
        name: 'room_duration_seconds',
        help: 'Room lifetime duration',
        buckets: [60, 300, 600, 1800, 3600, 7200] // 1m, 5m, 10m, 30m, 1h, 2h
    }),

    coinsInPlay: new Gauge({
        name: 'coins_in_play',
        help: 'Total coins currently in game physics'
    }),

    physicsTickDuration: new Histogram({
        name: 'physics_tick_duration_ms',
        help: 'Physics engine tick duration',
        buckets: [1, 5, 10, 16, 33, 50, 100] // targeting 30-60fps
    }),

    // ===== 用户相关 =====
    userRegistrations: new Counter({
        name: 'user_registrations_total',
        help: 'Total user registrations'
    }),

    userLogins: new Counter({
        name: 'user_logins_total',
        help: 'Total user logins',
        labelNames: ['method'] // method: password, wallet, guest
    }),

    userBalances: new Gauge({
        name: 'user_balance',
        help: 'User gold balance',
        labelNames: ['userId']
    }),

    // ===== API性能 =====
    httpRequestDuration: new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration',
        labelNames: ['method', 'route', 'status'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
    }),

    httpRequestTotal: new Counter({
        name: 'http_request_total',
        help: 'Total HTTP requests',
        labelNames: ['method', 'route', 'status']
    }),

    wsConnections: new Gauge({
        name: 'ws_connections_active',
        help: 'Active WebSocket connections'
    }),

    wsMessages: new Counter({
        name: 'ws_messages_total',
        help: 'Total WebSocket messages',
        labelNames: ['direction'] // direction: sent, received
    }),

    // ===== DragonflyDB相关 =====
    dragonflyOperations: new Counter({
        name: 'dragonfly_operations_total',
        help: 'DragonflyDB operations',
        labelNames: ['operation', 'status'] // operation: get, set, eval, etc.
    }),

    dragonflyLatency: new Histogram({
        name: 'dragonfly_latency_seconds',
        help: 'DragonflyDB operation latency',
        labelNames: ['operation'],
        buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1]
    }),

    dragonflyConnections: new Gauge({
        name: 'dragonfly_connections',
        help: 'Active DragonflyDB connections'
    }),

    // ===== 错误相关 =====
    errors: new Counter({
        name: 'errors_total',
        help: 'Total errors',
        labelNames: ['type', 'source'] // type: validation, database, network, etc.
    }),

    unhandledRejections: new Counter({
        name: 'unhandled_rejections_total',
        help: 'Unhandled promise rejections'
    }),
};

/**
 * 启动Prometheus指标服务器
 */
export function startMetricsServer(port: number = 9090): void {
    const app = express();

    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (err) {
            res.status(500).end(err);
        }
    });

    app.get('/health', (req, res) => {
        res.json({ status: 'healthy', timestamp: Date.now() });
    });

    app.listen(port, () => {
        console.log(`[Prometheus] Metrics server listening on :${port}/metrics`);
    });
}

/**
 * HTTP请求中间件（自动记录指标）
 */
export function prometheusMiddleware() {
    return (req: any, res: any, next: any) => {
        const start = Date.now();

        // 记录响应完成
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            const route = req.route?.path || req.path || 'unknown';

            Metrics.httpRequestDuration.observe(
                { method: req.method, route, status: res.statusCode },
                duration
            );

            Metrics.httpRequestTotal.inc({
                method: req.method,
                route,
                status: res.statusCode
            });
        });

        next();
    };
}

/**
 * 清除所有指标（用于测试）
 */
export function resetMetrics(): void {
    register.clear();
}

/**
 * 获取所有注册的指标
 */
export function getRegistry() {
    return register;
}
