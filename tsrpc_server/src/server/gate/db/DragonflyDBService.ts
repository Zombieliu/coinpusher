/**
 * 🐉 DragonflyDB Service
 *
 * 功能：
 * 1. DragonflyDB连接管理（兼容Redis协议）
 * 2. 排行榜（Sorted Set）
 * 3. 缓存管理
 * 4. 分布式锁
 *
 * DragonflyDB优势：
 * - 比Redis快25倍
 * - 内存效率提升30倍
 * - 完全兼容Redis协议
 * - 原生支持多线程
 */

import { createClient, RedisClientType } from 'redis';

export class DragonflyDBService {
    private static client: RedisClientType;
    private static isConnected: boolean = false;

    /**
     * 连接DragonflyDB
     */
    static async connect(url: string): Promise<void> {
        if (this.isConnected) {
            console.log('[DragonflyDB] Already connected');
            return;
        }

        try {
            this.client = createClient({
                url,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            return new Error('Max reconnection attempts reached');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            this.client.on('error', (err) => {
                console.error('[DragonflyDB] Error:', err);
            });

            this.client.on('connect', () => {
                console.log('[DragonflyDB] Connected');
            });

            this.client.on('reconnecting', () => {
                console.log('[DragonflyDB] Reconnecting...');
            });

            await this.client.connect();
            this.isConnected = true;

            console.log('[DragonflyDB] ✅ Connected successfully');
        } catch (error) {
            console.error('[DragonflyDB] ❌ Connection failed:', error);
            throw error;
        }
    }

    /**
     * 断开连接
     */
    static async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.isConnected = false;
            console.log('[DragonflyDB] Disconnected');
        }
    }

    /**
     * 获取客户端
     */
    static getClient(): RedisClientType {
        if (!this.isConnected) {
            throw new Error('[DragonflyDB] Not connected');
        }
        return this.client;
    }

    // ==================== 排行榜操作（Sorted Set） ====================

    /**
     * 更新排行榜分数
     */
    static async updateLeaderboardScore(
        leaderboardKey: string,
        userId: string,
        score: number
    ): Promise<void> {
        await this.client.zAdd(leaderboardKey, {
            score,
            value: userId
        });
    }

    /**
     * 批量更新排行榜分数
     */
    static async updateLeaderboardScoresBatch(
        leaderboardKey: string,
        scores: Array<{ userId: string; score: number }>
    ): Promise<void> {
        const members = scores.map(s => ({
            score: s.score,
            value: s.userId
        }));
        await this.client.zAdd(leaderboardKey, members);
    }

    /**
     * 增加排行榜分数
     */
    static async incrementLeaderboardScore(
        leaderboardKey: string,
        userId: string,
        increment: number
    ): Promise<number> {
        return await this.client.zIncrBy(leaderboardKey, increment, userId);
    }

    /**
     * 获取排行榜（从高到低）
     */
    static async getLeaderboard(
        leaderboardKey: string,
        start: number = 0,
        end: number = 99
    ): Promise<Array<{ userId: string; score: number; rank: number }>> {
        const results = await this.client.zRangeWithScores(
            leaderboardKey,
            start,
            end,
            { REV: true }
        );

        return results.map((item, index) => ({
            userId: item.value,
            score: item.score,
            rank: start + index + 1
        }));
    }

    /**
     * 获取用户排名（从高到低）
     */
    static async getUserRank(
        leaderboardKey: string,
        userId: string
    ): Promise<number | null> {
        const rank = await this.client.zRevRank(leaderboardKey, userId);
        return rank !== null ? rank + 1 : null;
    }

    /**
     * 获取用户分数
     */
    static async getUserScore(
        leaderboardKey: string,
        userId: string
    ): Promise<number | null> {
        return await this.client.zScore(leaderboardKey, userId);
    }

    /**
     * 获取排行榜大小
     */
    static async getLeaderboardSize(leaderboardKey: string): Promise<number> {
        return await this.client.zCard(leaderboardKey);
    }

    /**
     * 获取用户周围的排名
     */
    static async getUserSurroundings(
        leaderboardKey: string,
        userId: string,
        range: number = 5
    ): Promise<Array<{ userId: string; score: number; rank: number }> | null> {
        const rank = await this.client.zRevRank(leaderboardKey, userId);
        if (rank === null) {
            return null;
        }

        const start = Math.max(0, rank - range);
        const end = rank + range;

        const results = await this.client.zRangeWithScores(
            leaderboardKey,
            start,
            end,
            { REV: true }
        );

        return results.map((item, index) => ({
            userId: item.value,
            score: item.score,
            rank: start + index + 1
        }));
    }

    /**
     * 删除排行榜
     */
    static async deleteLeaderboard(leaderboardKey: string): Promise<void> {
        await this.client.del(leaderboardKey);
    }

    /**
     * 删除用户排行榜数据
     */
    static async removeUserFromLeaderboard(
        leaderboardKey: string,
        userId: string
    ): Promise<void> {
        await this.client.zRem(leaderboardKey, userId);
    }

    /**
     * 获取分数范围内的玩家
     */
    static async getLeaderboardByScoreRange(
        leaderboardKey: string,
        minScore: number,
        maxScore: number
    ): Promise<Array<{ userId: string; score: number }>> {
        const results = await (this.client.zRangeByScoreWithScores as any)(
            leaderboardKey,
            minScore,
            maxScore,
            { REV: true }
        );

        return results.map(item => ({
            userId: item.value,
            score: item.score
        }));
    }

    // ==================== 缓存操作 ====================

    /**
     * 设置缓存
     */
    static async set(
        key: string,
        value: string,
        expirySeconds?: number
    ): Promise<void> {
        if (expirySeconds) {
            await this.client.setEx(key, expirySeconds, value);
        } else {
            await this.client.set(key, value);
        }
    }

    /**
     * 设置JSON缓存
     */
    static async setJSON(
        key: string,
        value: any,
        expirySeconds?: number
    ): Promise<void> {
        await this.set(key, JSON.stringify(value), expirySeconds);
    }

    /**
     * 获取缓存
     */
    static async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    /**
     * 有序集合写入（兼容旧接口命名）
     */
    static async zadd(key: string, score: number, member: string): Promise<void> {
        await this.client.zAdd(key, [{ score, value: member }]);
    }

    /**
     * 获取JSON缓存
     */
    static async getJSON<T = any>(key: string): Promise<T | null> {
        const value = await this.get(key);
        return value ? JSON.parse(value) : null;
    }

    /**
     * 删除缓存
     */
    static async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    /**
     * 批量删除缓存
     */
    static async delBatch(keys: string[]): Promise<void> {
        if (keys.length > 0) {
            await this.client.del(keys);
        }
    }

    /**
     * 判断key是否存在
     */
    static async exists(key: string): Promise<boolean> {
        return (await this.client.exists(key)) === 1;
    }

    /**
     * 设置过期时间
     */
    static async expire(key: string, seconds: number): Promise<void> {
        await this.client.expire(key, seconds);
    }

    /**
     * 获取TTL
     */
    static async ttl(key: string): Promise<number> {
        return await this.client.ttl(key);
    }

    // ==================== 计数器 ====================

    /**
     * 增加计数
     */
    static async incr(key: string): Promise<number> {
        return await this.client.incr(key);
    }

    /**
     * 增加指定值
     */
    static async incrBy(key: string, increment: number): Promise<number> {
        return await this.client.incrBy(key, increment);
    }

    /**
     * 减少计数
     */
    static async decr(key: string): Promise<number> {
        return await this.client.decr(key);
    }

    // ==================== Hash操作 ====================

    /**
     * 设置Hash字段
     */
    static async hSet(key: string, field: string, value: string): Promise<void> {
        await this.client.hSet(key, field, value);
    }

    /**
     * 获取Hash字段
     */
    static async hGet(key: string, field: string): Promise<string | undefined> {
        return await this.client.hGet(key, field);
    }

    /**
     * 获取整个Hash
     */
    static async hGetAll(key: string): Promise<Record<string, string>> {
        return await this.client.hGetAll(key);
    }

    /**
     * 删除Hash字段
     */
    static async hDel(key: string, field: string): Promise<void> {
        await this.client.hDel(key, field);
    }

    // ==================== 分布式锁 ====================

    /**
     * 获取分布式锁
     */
    static async acquireLock(
        lockKey: string,
        ttlSeconds: number = 10
    ): Promise<boolean> {
        const result = await this.client.set(lockKey, '1', {
            NX: true,
            EX: ttlSeconds
        });
        return result === 'OK';
    }

    /**
     * 释放分布式锁
     */
    static async releaseLock(lockKey: string): Promise<void> {
        await this.client.del(lockKey);
    }

    /**
     * 执行带锁的操作
     */
    static async withLock<T>(
        lockKey: string,
        callback: () => Promise<T>,
        ttlSeconds: number = 10
    ): Promise<T | null> {
        const acquired = await this.acquireLock(lockKey, ttlSeconds);
        if (!acquired) {
            console.warn(`[DragonflyDB] Failed to acquire lock: ${lockKey}`);
            return null;
        }

        try {
            return await callback();
        } finally {
            await this.releaseLock(lockKey);
        }
    }

    // ==================== 健康检查 ====================

    /**
     * Ping检查
     */
    static async ping(): Promise<boolean> {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch (error) {
            console.error('[DragonflyDB] Ping failed:', error);
            return false;
        }
    }

    /**
     * 获取信息
     */
    static async info(section?: string): Promise<string> {
        return await this.client.info(section);
    }
}
