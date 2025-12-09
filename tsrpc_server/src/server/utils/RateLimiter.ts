/**
 * 速率限制器 - 用于防止滥用API
 *
 * 使用场景：
 * - 投币冷却（防刷币）
 * - API请求限流
 * - 登录尝试限制
 */
export class RateLimiter {
    private lastActionTimes: Map<string, number> = new Map();
    private cooldownMs: number;
    private name: string;

    /**
     * @param name 限制器名称（用于日志）
     * @param cooldownMs 冷却时间（毫秒）
     */
    constructor(name: string, cooldownMs: number) {
        this.name = name;
        this.cooldownMs = cooldownMs;
    }

    /**
     * 检查是否允许执行操作
     * @param key 唯一标识（如userId）
     * @returns true=允许, false=冷却中
     */
    check(key: string): boolean {
        const now = Date.now();
        const lastAction = this.lastActionTimes.get(key);

        if (lastAction && (now - lastAction) < this.cooldownMs) {
            const remainingMs = this.cooldownMs - (now - lastAction);
            console.warn(`[${this.name}] Rate limit: ${key} must wait ${remainingMs}ms`);
            return false;
        }

        return true;
    }

    /**
     * 记录操作时间
     * @param key 唯一标识
     */
    record(key: string): void {
        this.lastActionTimes.set(key, Date.now());
    }

    /**
     * 获取剩余冷却时间
     * @param key 唯一标识
     * @returns 剩余毫秒数（0表示无冷却）
     */
    getRemainingCooldown(key: string): number {
        const now = Date.now();
        const lastAction = this.lastActionTimes.get(key);

        if (!lastAction) {
            return 0;
        }

        const remaining = this.cooldownMs - (now - lastAction);
        return Math.max(0, remaining);
    }

    /**
     * 清理过期记录（可选，用于节省内存）
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, time] of this.lastActionTimes.entries()) {
            if (now - time > this.cooldownMs * 2) {
                this.lastActionTimes.delete(key);
            }
        }
    }
}

/**
 * 滑动窗口限流器 - 更精确的频率控制
 *
 * 例如：每分钟最多10次操作
 */
export class SlidingWindowLimiter {
    private actionTimestamps: Map<string, number[]> = new Map();
    private maxActions: number;
    private windowMs: number;
    private name: string;

    /**
     * @param name 限制器名称
     * @param maxActions 时间窗口内最大操作次数
     * @param windowMs 时间窗口（毫秒）
     */
    constructor(name: string, maxActions: number, windowMs: number) {
        this.name = name;
        this.maxActions = maxActions;
        this.windowMs = windowMs;
    }

    /**
     * 检查是否允许执行操作
     * @param key 唯一标识
     * @returns true=允许, false=超出限制
     */
    check(key: string): boolean {
        const now = Date.now();
        const timestamps = this.actionTimestamps.get(key) || [];

        // 清理过期时间戳
        const validTimestamps = timestamps.filter(t => (now - t) < this.windowMs);

        if (validTimestamps.length >= this.maxActions) {
            const oldestTimestamp = validTimestamps[0];
            const resetInMs = this.windowMs - (now - oldestTimestamp);
            console.warn(`[${this.name}] Rate limit exceeded: ${key} (${validTimestamps.length}/${this.maxActions}), reset in ${Math.ceil(resetInMs / 1000)}s`);
            return false;
        }

        return true;
    }

    /**
     * 记录操作
     * @param key 唯一标识
     */
    record(key: string): void {
        const now = Date.now();
        const timestamps = this.actionTimestamps.get(key) || [];
        const validTimestamps = timestamps.filter(t => (now - t) < this.windowMs);

        validTimestamps.push(now);
        this.actionTimestamps.set(key, validTimestamps);
    }

    /**
     * 获取当前使用量
     * @param key 唯一标识
     * @returns {current, max, resetInMs}
     */
    getUsage(key: string): { current: number; max: number; resetInMs: number } {
        const now = Date.now();
        const timestamps = this.actionTimestamps.get(key) || [];
        const validTimestamps = timestamps.filter(t => (now - t) < this.windowMs);

        let resetInMs = 0;
        if (validTimestamps.length > 0) {
            const oldestTimestamp = validTimestamps[0];
            resetInMs = this.windowMs - (now - oldestTimestamp);
        }

        return {
            current: validTimestamps.length,
            max: this.maxActions,
            resetInMs: Math.max(0, resetInMs)
        };
    }

    /**
     * 清理过期数据
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, timestamps] of this.actionTimestamps.entries()) {
            const validTimestamps = timestamps.filter(t => (now - t) < this.windowMs);
            if (validTimestamps.length === 0) {
                this.actionTimestamps.delete(key);
            } else {
                this.actionTimestamps.set(key, validTimestamps);
            }
        }
    }
}
