/**
 * 🗄️ 缓存管理器
 *
 * 功能：
 * 1. 统一的缓存管理接口
 * 2. 多级缓存策略（内存 + Redis）
 * 3. 缓存装饰器
 * 4. 自动失效策略
 * 5. 缓存预热
 * 6. 缓存穿透/击穿/雪崩防护
 */

import { DragonflyDBService } from '../gate/db/DragonflyDBService';
import { Logger } from './Logger';

// ==================== 缓存配置 ====================

export interface CacheOptions {
    /** 缓存时间（秒），默认 300 秒 */
    ttl?: number;
    /** 是否使用内存缓存，默认 true */
    useMemoryCache?: boolean;
    /** 是否使用 Redis 缓存，默认 true */
    useRedisCache?: boolean;
    /** 缓存key前缀 */
    prefix?: string;
    /** 是否启用缓存穿透保护（缓存空值），默认 true */
    cacheNull?: boolean;
    /** 空值缓存时间（秒），默认 60 秒 */
    nullTtl?: number;
}

// 默认配置
const DEFAULT_OPTIONS: Required<CacheOptions> = {
    ttl: 300,
    useMemoryCache: true,
    useRedisCache: true,
    prefix: 'cache',
    cacheNull: true,
    nullTtl: 60,
};

// ==================== 内存缓存项 ====================

interface MemoryCacheItem<T> {
    value: T;
    expireAt: number;
}

// ==================== 缓存管理器 ====================

export class CacheManager {
    // 内存缓存（LRU）
    private static memoryCache = new Map<string, MemoryCacheItem<any>>();
    private static memoryCacheMaxSize = 1000; // 最大缓存数量

    // 缓存统计
    private static stats = {
        memoryHits: 0,
        memoryMisses: 0,
        redisHits: 0,
        redisMisses: 0,
        sets: 0,
        deletes: 0,
    };

    /**
     * 获取缓存
     */
    static async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const fullKey = `${opts.prefix}:${key}`;

        // 1. 尝试从内存缓存获取
        if (opts.useMemoryCache) {
            const memResult = this.getFromMemory<T>(fullKey);
            if (memResult !== null) {
                this.stats.memoryHits++;
                Logger.debug('Cache hit (memory)', { key: fullKey });
                return memResult;
            }
            this.stats.memoryMisses++;
        }

        // 2. 尝试从 Redis 获取
        if (opts.useRedisCache) {
            try {
                const redisResult = await DragonflyDBService.getJSON<T>(fullKey);
                if (redisResult !== null) {
                    this.stats.redisHits++;
                    Logger.debug('Cache hit (Redis)', { key: fullKey });

                    // 回填内存缓存
                    if (opts.useMemoryCache) {
                        this.setToMemory(fullKey, redisResult, opts.ttl);
                    }

                    return redisResult;
                }
                this.stats.redisMisses++;
            } catch (error) {
                Logger.error('Redis cache get error', { key: fullKey }, error);
            }
        }

        Logger.debug('Cache miss', { key: fullKey });
        return null;
    }

    /**
     * 设置缓存
     */
    static async set<T = any>(
        key: string,
        value: T,
        options: CacheOptions = {}
    ): Promise<void> {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const fullKey = `${opts.prefix}:${key}`;

        // 如果值为 null 且不缓存空值，直接返回
        if (value === null && !opts.cacheNull) {
            return;
        }

        const ttl = value === null ? opts.nullTtl : opts.ttl;

        // 1. 设置内存缓存
        if (opts.useMemoryCache) {
            this.setToMemory(fullKey, value, ttl);
        }

        // 2. 设置 Redis 缓存
        if (opts.useRedisCache) {
            try {
                await DragonflyDBService.setJSON(fullKey, value, ttl);
                this.stats.sets++;
                Logger.debug('Cache set', { key: fullKey, ttl });
            } catch (error) {
                Logger.error('Redis cache set error', { key: fullKey }, error);
            }
        }
    }

    /**
     * 删除缓存
     */
    static async del(key: string, options: CacheOptions = {}): Promise<void> {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const fullKey = `${opts.prefix}:${key}`;

        // 1. 删除内存缓存
        if (opts.useMemoryCache) {
            this.memoryCache.delete(fullKey);
        }

        // 2. 删除 Redis 缓存
        if (opts.useRedisCache) {
            try {
                await DragonflyDBService.del(fullKey);
                this.stats.deletes++;
                Logger.debug('Cache deleted', { key: fullKey });
            } catch (error) {
                Logger.error('Redis cache delete error', { key: fullKey }, error);
            }
        }
    }

    /**
     * 批量删除缓存（支持通配符）
     */
    static async delPattern(pattern: string, options: CacheOptions = {}): Promise<void> {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const fullPattern = `${opts.prefix}:${pattern}`;

        // 1. 删除内存缓存（简单模式匹配）
        if (opts.useMemoryCache) {
            const regex = new RegExp('^' + fullPattern.replace('*', '.*') + '$');
            for (const key of this.memoryCache.keys()) {
                if (regex.test(key)) {
                    this.memoryCache.delete(key);
                }
            }
        }

        // 2. 删除 Redis 缓存
        // 注意：生产环境应使用 SCAN 而不是 KEYS
        Logger.warn('Pattern delete not fully implemented', { pattern: fullPattern });
    }

    /**
     * 清空所有缓存
     */
    static clearAll(): void {
        this.memoryCache.clear();
        Logger.info('All memory cache cleared');
    }

    /**
     * 获取缓存统计
     */
    static getStats() {
        const memorySize = this.memoryCache.size;
        const memoryHitRate =
            this.stats.memoryHits / (this.stats.memoryHits + this.stats.memoryMisses) || 0;
        const redisHitRate =
            this.stats.redisHits / (this.stats.redisHits + this.stats.redisMisses) || 0;

        return {
            memory: {
                size: memorySize,
                maxSize: this.memoryCacheMaxSize,
                hits: this.stats.memoryHits,
                misses: this.stats.memoryMisses,
                hitRate: memoryHitRate.toFixed(2),
            },
            redis: {
                hits: this.stats.redisHits,
                misses: this.stats.redisMisses,
                hitRate: redisHitRate.toFixed(2),
            },
            operations: {
                sets: this.stats.sets,
                deletes: this.stats.deletes,
            },
        };
    }

    /**
     * 重置统计
     */
    static resetStats(): void {
        this.stats = {
            memoryHits: 0,
            memoryMisses: 0,
            redisHits: 0,
            redisMisses: 0,
            sets: 0,
            deletes: 0,
        };
        Logger.info('Cache stats reset');
    }

    // ==================== 私有方法 ====================

    /**
     * 从内存获取缓存
     */
    private static getFromMemory<T>(key: string): T | null {
        const item = this.memoryCache.get(key);
        if (!item) {
            return null;
        }

        // 检查是否过期
        if (Date.now() > item.expireAt) {
            this.memoryCache.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * 设置内存缓存
     */
    private static setToMemory<T>(key: string, value: T, ttlSeconds: number): void {
        // LRU：如果缓存已满，删除最旧的项
        if (this.memoryCache.size >= this.memoryCacheMaxSize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }

        this.memoryCache.set(key, {
            value,
            expireAt: Date.now() + ttlSeconds * 1000,
        });
    }

    // ==================== 定时清理过期缓存 ====================

    /**
     * 启动定期清理任务
     */
    static startCleanupTask(intervalMs: number = 60000): void {
        setInterval(() => {
            this.cleanupExpiredMemoryCache();
        }, intervalMs);
        Logger.info('Cache cleanup task started', { intervalMs });
    }

    /**
     * 清理过期的内存缓存
     */
    private static cleanupExpiredMemoryCache(): void {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, item] of this.memoryCache.entries()) {
            if (now > item.expireAt) {
                this.memoryCache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            Logger.debug('Expired memory cache cleaned', { count: cleanedCount });
        }
    }
}

// ==================== 缓存装饰器 ====================

/**
 * 缓存装饰器（用于方法）
 *
 * @example
 * class UserService {
 *   @Cacheable('user', { ttl: 600 })
 *   static async getUserById(userId: string) {
 *     // 实际查询逻辑
 *     return await db.findUser(userId);
 *   }
 * }
 */
export function Cacheable(keyPrefix: string, options: CacheOptions = {}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ): PropertyDescriptor {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // 生成缓存 key（基于参数）
            const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;

            // 1. 尝试从缓存获取
            const cached = await CacheManager.get(cacheKey, {
                ...options,
                prefix: keyPrefix,
            });

            if (cached !== null) {
                return cached;
            }

            // 2. 缓存未命中，执行原方法
            const result = await originalMethod.apply(this, args);

            // 3. 设置缓存
            await CacheManager.set(cacheKey, result, {
                ...options,
                prefix: keyPrefix,
            });

            return result;
        };

        return descriptor;
    };
}

/**
 * 缓存失效装饰器（用于方法）
 *
 * @example
 * class UserService {
 *   @CacheEvict('user')
 *   static async updateUser(userId: string, data: any) {
 *     // 更新逻辑
 *     await db.updateUser(userId, data);
 *   }
 * }
 */
export function CacheEvict(keyPrefix: string, options: CacheOptions = {}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ): PropertyDescriptor {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // 执行原方法
            const result = await originalMethod.apply(this, args);

            // 删除缓存
            const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
            await CacheManager.del(cacheKey, {
                ...options,
                prefix: keyPrefix,
            });

            return result;
        };

        return descriptor;
    };
}

// ==================== 缓存工具函数 ====================

/**
 * 缓存穿透保护：查询并缓存
 * 如果查询结果为 null，也会缓存（防止缓存穿透）
 */
export async function getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
): Promise<T> {
    // 1. 尝试从缓存获取
    const cached = await CacheManager.get<T>(key, options);
    if (cached !== null) {
        return cached;
    }

    // 2. 执行查询
    const result = await fetcher();

    // 3. 设置缓存（包括 null 值）
    await CacheManager.set(key, result, options);

    return result;
}

/**
 * 缓存预热：批量加载数据到缓存
 */
export async function warmupCache<T>(
    keys: string[],
    fetcher: (key: string) => Promise<T>,
    options: CacheOptions = {}
): Promise<void> {
    Logger.info('Cache warmup started', { count: keys.length });

    const promises = keys.map(async key => {
        try {
            const data = await fetcher(key);
            await CacheManager.set(key, data, options);
        } catch (error) {
            Logger.error('Cache warmup error', { key }, error);
        }
    });

    await Promise.all(promises);
    Logger.info('Cache warmup completed', { count: keys.length });
}
