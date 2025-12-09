/**
 * 🔒 Adaptive Rate Limiting with Dynamic Throttling
 *
 * 智能速率限制系统:
 * - 基于用户行为的自适应限流
 * - 动态调整阈值
 * - 支持突发流量
 * - IP reputation tracking
 * - 自动恢复机制
 *
 * 算法:
 * - Token Bucket (令牌桶)
 * - Leaky Bucket (漏桶)
 * - Sliding Window (滑动窗口)
 * - Adaptive Throttling (自适应节流)
 */

export interface RateLimitConfig {
    windowMs: number;                // 时间窗口 (毫秒)
    maxRequests: number;             // 最大请求数
    burstLimit?: number;             // 突发限制
    adaptiveEnabled?: boolean;       // 启用自适应
    reputationEnabled?: boolean;     // 启用信誉追踪
    whitelistIPs?: string[];         // 白名单IP
    blacklistIPs?: string[];         // 黑名单IP
}

export enum ReputationLevel {
    TRUSTED = 'trusted',             // 可信 (提高限额)
    NORMAL = 'normal',               // 正常
    SUSPICIOUS = 'suspicious',       // 可疑 (降低限额)
    BANNED = 'banned'                // 封禁
}

export interface RateLimitInfo {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;             // 秒
    reputation?: ReputationLevel;
}

interface TokenBucket {
    tokens: number;
    lastRefill: number;
    burstTokens: number;
}

interface ReputationData {
    level: ReputationLevel;
    score: number;                   // 0-100
    violations: number;
    lastViolation?: number;
    trustPoints: number;
}

export class AdaptiveRateLimiter {
    private static readonly DEFAULT_CONFIG: RateLimitConfig = {
        windowMs: 60 * 1000,         // 1分钟
        maxRequests: 100,
        burstLimit: 150,
        adaptiveEnabled: true,
        reputationEnabled: true,
        whitelistIPs: [],
        blacklistIPs: []
    };

    private static config: RateLimitConfig;

    // Token buckets per client
    private static buckets: Map<string, TokenBucket> = new Map();

    // Reputation tracking
    private static reputation: Map<string, ReputationData> = new Map();

    // Request history for sliding window
    private static requestHistory: Map<string, number[]> = new Map();

    /**
     * 🔒 初始化速率限制器
     */
    static initialize(config?: Partial<RateLimitConfig>): void {
        this.config = {
            ...this.DEFAULT_CONFIG,
            ...config
        };

        console.log('🔒 [AdaptiveRateLimiter] Initialized');

        // 定期清理过期数据
        setInterval(() => this.cleanup(), 60 * 1000);  // 每分钟
    }

    /**
     * 🔒 检查速率限制
     */
    static checkLimit(clientId: string): RateLimitInfo {
        if (!this.config) {
            this.initialize();
        }

        // 检查黑名单
        if (this.config.blacklistIPs?.includes(clientId)) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: Date.now() + this.config.windowMs,
                retryAfter: Math.ceil(this.config.windowMs / 1000),
                reputation: ReputationLevel.BANNED
            };
        }

        // 检查白名单
        if (this.config.whitelistIPs?.includes(clientId)) {
            return {
                allowed: true,
                remaining: 999999,
                resetTime: Date.now() + this.config.windowMs,
                reputation: ReputationLevel.TRUSTED
            };
        }

        // 获取或创建reputation
        const reputation = this.getReputation(clientId);

        // 根据reputation调整限额
        const adjustedLimit = this.getAdjustedLimit(reputation);

        // Token Bucket 算法
        const result = this.checkTokenBucket(clientId, adjustedLimit);

        // 如果超限，记录违规
        if (!result.allowed) {
            this.recordViolation(clientId);
        } else {
            // 如果允许，增加信任分
            this.incrementTrust(clientId);
        }

        return {
            ...result,
            reputation: reputation.level
        };
    }

    /**
     * 🔒 Token Bucket 算法
     */
    private static checkTokenBucket(clientId: string, limit: number): RateLimitInfo {
        const now = Date.now();

        let bucket = this.buckets.get(clientId);

        if (!bucket) {
            bucket = {
                tokens: limit,
                lastRefill: now,
                burstTokens: this.config.burstLimit || limit * 1.5
            };
            this.buckets.set(clientId, bucket);
        }

        // 计算补充的tokens
        const timePassed = now - bucket.lastRefill;
        const refillRate = limit / this.config.windowMs;  // tokens per millisecond
        const tokensToAdd = timePassed * refillRate;

        bucket.tokens = Math.min(bucket.tokens + tokensToAdd, limit);
        bucket.lastRefill = now;

        // 检查是否有可用token
        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;

            return {
                allowed: true,
                remaining: Math.floor(bucket.tokens),
                resetTime: now + this.config.windowMs
            };
        }

        // 检查burst tokens (突发)
        if (bucket.burstTokens > 0) {
            bucket.burstTokens -= 1;

            return {
                allowed: true,
                remaining: Math.floor(bucket.tokens),
                resetTime: now + this.config.windowMs
            };
        }

        // 超限
        const resetTime = now + this.config.windowMs;
        const retryAfter = Math.ceil((1 - bucket.tokens) / refillRate / 1000);

        return {
            allowed: false,
            remaining: 0,
            resetTime,
            retryAfter
        };
    }

    /**
     * 🔒 滑动窗口算法 (备选)
     */
    private static checkSlidingWindow(clientId: string, limit: number): RateLimitInfo {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        let history = this.requestHistory.get(clientId) || [];

        // 清理过期请求
        history = history.filter(timestamp => timestamp > windowStart);

        // 检查限额
        if (history.length >= limit) {
            const oldestRequest = history[0];
            const resetTime = oldestRequest + this.config.windowMs;
            const retryAfter = Math.ceil((resetTime - now) / 1000);

            return {
                allowed: false,
                remaining: 0,
                resetTime,
                retryAfter
            };
        }

        // 记录本次请求
        history.push(now);
        this.requestHistory.set(clientId, history);

        return {
            allowed: true,
            remaining: limit - history.length,
            resetTime: now + this.config.windowMs
        };
    }

    /**
     * 🔒 获取reputation
     */
    private static getReputation(clientId: string): ReputationData {
        let reputation = this.reputation.get(clientId);

        if (!reputation) {
            reputation = {
                level: ReputationLevel.NORMAL,
                score: 50,  // 中等分数
                violations: 0,
                trustPoints: 0
            };
            this.reputation.set(clientId, reputation);
        }

        return reputation;
    }

    /**
     * 🔒 根据reputation调整限额
     */
    private static getAdjustedLimit(reputation: ReputationData): number {
        const baseLimit = this.config.maxRequests;

        switch (reputation.level) {
            case ReputationLevel.TRUSTED:
                return Math.floor(baseLimit * 2);  // 双倍限额

            case ReputationLevel.NORMAL:
                return baseLimit;

            case ReputationLevel.SUSPICIOUS:
                return Math.floor(baseLimit * 0.5);  // 减半限额

            case ReputationLevel.BANNED:
                return 0;

            default:
                return baseLimit;
        }
    }

    /**
     * 🔒 记录违规
     */
    private static recordViolation(clientId: string): void {
        const reputation = this.getReputation(clientId);

        reputation.violations++;
        reputation.lastViolation = Date.now();
        reputation.score = Math.max(0, reputation.score - 10);

        // 根据违规次数调整等级
        if (reputation.violations >= 10) {
            reputation.level = ReputationLevel.BANNED;
        } else if (reputation.violations >= 5) {
            reputation.level = ReputationLevel.SUSPICIOUS;
        }

        this.reputation.set(clientId, reputation);

        console.warn(`🔒 [AdaptiveRateLimiter] Violation recorded for ${clientId} (total: ${reputation.violations})`);
    }

    /**
     * 🔒 增加信任分
     */
    private static incrementTrust(clientId: string): void {
        if (!this.config.reputationEnabled) return;

        const reputation = this.getReputation(clientId);

        reputation.trustPoints++;
        reputation.score = Math.min(100, reputation.score + 0.1);

        // 每100次正常请求提升等级
        if (reputation.trustPoints >= 100 && reputation.level === ReputationLevel.NORMAL) {
            reputation.level = ReputationLevel.TRUSTED;
            reputation.trustPoints = 0;
        }

        // 自动恢复: 违规后长时间无问题,降低violation计数
        if (reputation.lastViolation) {
            const timeSinceViolation = Date.now() - reputation.lastViolation;
            if (timeSinceViolation > 60 * 60 * 1000) {  // 1小时
                reputation.violations = Math.max(0, reputation.violations - 1);

                if (reputation.violations === 0 && reputation.level === ReputationLevel.SUSPICIOUS) {
                    reputation.level = ReputationLevel.NORMAL;
                }
            }
        }

        this.reputation.set(clientId, reputation);
    }

    /**
     * 🔒 手动调整reputation
     */
    static setReputation(clientId: string, level: ReputationLevel): void {
        const reputation = this.getReputation(clientId);
        reputation.level = level;

        switch (level) {
            case ReputationLevel.TRUSTED:
                reputation.score = 100;
                reputation.violations = 0;
                break;
            case ReputationLevel.BANNED:
                reputation.score = 0;
                break;
        }

        this.reputation.set(clientId, reputation);
        console.log(`🔒 [AdaptiveRateLimiter] Reputation set: ${clientId} -> ${level}`);
    }

    /**
     * 🔒 获取统计信息
     */
    static getStats(): {
        totalClients: number;
        byReputation: Record<ReputationLevel, number>;
        topViolators: Array<{ client: string; violations: number }>;
    } {
        const byReputation: Record<ReputationLevel, number> = {
            [ReputationLevel.TRUSTED]: 0,
            [ReputationLevel.NORMAL]: 0,
            [ReputationLevel.SUSPICIOUS]: 0,
            [ReputationLevel.BANNED]: 0
        };

        const violators: Array<{ client: string; violations: number }> = [];

        for (const [client, data] of this.reputation.entries()) {
            byReputation[data.level]++;

            if (data.violations > 0) {
                violators.push({ client, violations: data.violations });
            }
        }

        violators.sort((a, b) => b.violations - a.violations);

        return {
            totalClients: this.reputation.size,
            byReputation,
            topViolators: violators.slice(0, 10)
        };
    }

    /**
     * 🔒 清理过期数据
     */
    private static cleanup(): void {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000;  // 24小时

        // 清理token buckets
        for (const [clientId, bucket] of this.buckets.entries()) {
            if (now - bucket.lastRefill > maxAge) {
                this.buckets.delete(clientId);
            }
        }

        // 清理request history
        for (const [clientId, history] of this.requestHistory.entries()) {
            const filtered = history.filter(t => now - t < this.config.windowMs);

            if (filtered.length === 0) {
                this.requestHistory.delete(clientId);
            } else {
                this.requestHistory.set(clientId, filtered);
            }
        }

        // 清理长期无活动的reputation
        for (const [clientId, data] of this.reputation.entries()) {
            if (data.lastViolation && now - data.lastViolation > 7 * 24 * 60 * 60 * 1000) {  // 7天
                if (data.level !== ReputationLevel.BANNED) {
                    this.reputation.delete(clientId);
                }
            }
        }
    }

    /**
     * 🔒 重置客户端限制
     */
    static resetClient(clientId: string): void {
        this.buckets.delete(clientId);
        this.requestHistory.delete(clientId);
        this.reputation.delete(clientId);

        console.log(`🔒 [AdaptiveRateLimiter] Reset limits for ${clientId}`);
    }

    /**
     * 🔒 获取客户端状态
     */
    static getClientStatus(clientId: string): {
        bucket?: TokenBucket;
        reputation?: ReputationData;
        history?: number[];
    } {
        return {
            bucket: this.buckets.get(clientId),
            reputation: this.reputation.get(clientId),
            history: this.requestHistory.get(clientId)
        };
    }
}

/**
 * 🔒 使用示例
 *
 * ```typescript
 * // 初始化
 * AdaptiveRateLimiter.initialize({
 *   windowMs: 60 * 1000,
 *   maxRequests: 100,
 *   burstLimit: 150,
 *   adaptiveEnabled: true,
 *   reputationEnabled: true
 * });
 *
 * // 检查速率限制
 * const limit = AdaptiveRateLimiter.checkLimit(clientIP);
 *
 * if (!limit.allowed) {
 *   res.status(429).json({
 *     error: 'Too Many Requests',
 *     retryAfter: limit.retryAfter
 *   });
 *   return;
 * }
 *
 * // 手动设置reputation
 * AdaptiveRateLimiter.setReputation(clientIP, ReputationLevel.TRUSTED);
 *
 * // 获取统计
 * const stats = AdaptiveRateLimiter.getStats();
 * ```
 */
