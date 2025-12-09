/**
 * 🏥 健康检查系统
 *
 * 功能：
 * 1. /health - 基础健康检查（存活探针）
 * 2. /ready - 就绪检查（就绪探针）
 * 3. 各依赖服务的健康状态检查
 */

import { MongoDBService } from '../gate/db/MongoDBService';
import { DragonflyDBService } from '../gate/db/DragonflyDBService';
import { Logger } from './Logger';

export interface HealthStatus {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: number;
    uptime: number;
    checks: {
        [key: string]: {
            status: 'up' | 'down' | 'degraded';
            message?: string;
            responseTime?: number;
        };
    };
}

export interface ReadinessStatus {
    ready: boolean;
    timestamp: number;
    checks: {
        [key: string]: {
            ready: boolean;
            message?: string;
        };
    };
}

export class HealthCheck {
    private static startTime: number = Date.now();

    /**
     * 基础健康检查（存活探针）
     * 用于 Kubernetes liveness probe
     * 只要进程还活着就返回 healthy
     */
    static async liveness(): Promise<HealthStatus> {
        const uptime = Date.now() - this.startTime;

        return {
            status: 'healthy',
            timestamp: Date.now(),
            uptime,
            checks: {
                process: {
                    status: 'up',
                    message: 'Process is running',
                },
            },
        };
    }

    /**
     * 就绪检查（就绪探针）
     * 用于 Kubernetes readiness probe
     * 检查所有依赖服务是否就绪
     */
    static async readiness(): Promise<ReadinessStatus> {
        const checks: ReadinessStatus['checks'] = {};

        // 检查 MongoDB
        try {
            const mongoReady = await this.checkMongoDB();
            checks.mongodb = {
                ready: mongoReady,
                message: mongoReady ? 'MongoDB is ready' : 'MongoDB is not ready',
            };
        } catch (error) {
            checks.mongodb = {
                ready: false,
                message: `MongoDB check failed: ${error}`,
            };
        }

        // 检查 DragonflyDB/Redis
        try {
            const redisReady = await this.checkDragonflyDB();
            checks.redis = {
                ready: redisReady,
                message: redisReady ? 'Redis is ready' : 'Redis is not ready',
            };
        } catch (error) {
            checks.redis = {
                ready: false,
                message: `Redis check failed: ${error}`,
            };
        }

        // 判断整体就绪状态
        const ready = Object.values(checks).every(check => check.ready);

        return {
            ready,
            timestamp: Date.now(),
            checks,
        };
    }

    /**
     * 完整健康检查
     * 包含所有依赖服务的详细状态
     */
    static async fullHealth(): Promise<HealthStatus> {
        const uptime = Date.now() - this.startTime;
        const checks: HealthStatus['checks'] = {};

        // 1. 检查进程状态
        checks.process = {
            status: 'up',
            message: `Uptime: ${Math.floor(uptime / 1000)}s`,
        };

        // 2. 检查内存使用
        const memoryUsage = process.memoryUsage();
        const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        const memoryUsagePercent = (memoryUsedMB / memoryTotalMB) * 100;

        checks.memory = {
            status: memoryUsagePercent > 90 ? 'degraded' : 'up',
            message: `${memoryUsedMB}MB / ${memoryTotalMB}MB (${memoryUsagePercent.toFixed(1)}%)`,
        };

        // 3. 检查 MongoDB
        try {
            const startTime = Date.now();
            const mongoHealthy = await this.checkMongoDB();
            const responseTime = Date.now() - startTime;

            checks.mongodb = {
                status: mongoHealthy ? 'up' : 'down',
                message: mongoHealthy
                    ? 'MongoDB connection is healthy'
                    : 'MongoDB connection failed',
                responseTime,
            };
        } catch (error) {
            checks.mongodb = {
                status: 'down',
                message: `MongoDB error: ${error}`,
            };
        }

        // 4. 检查 DragonflyDB/Redis
        try {
            const startTime = Date.now();
            const redisHealthy = await this.checkDragonflyDB();
            const responseTime = Date.now() - startTime;

            checks.redis = {
                status: redisHealthy ? 'up' : 'down',
                message: redisHealthy ? 'Redis connection is healthy' : 'Redis connection failed',
                responseTime,
            };
        } catch (error) {
            checks.redis = {
                status: 'down',
                message: `Redis error: ${error}`,
            };
        }

        // 判断整体健康状态
        const allUp = Object.values(checks).every(check => check.status === 'up');
        const anyDown = Object.values(checks).some(check => check.status === 'down');

        const status = anyDown ? 'unhealthy' : allUp ? 'healthy' : 'degraded';

        return {
            status,
            timestamp: Date.now(),
            uptime,
            checks,
        };
    }

    /**
     * 检查 MongoDB 连接
     */
    private static async checkMongoDB(): Promise<boolean> {
        try {
            // 尝试执行一个简单的查询
            const db = MongoDBService.getDatabase();
            await db.admin().ping();
            return true;
        } catch (error) {
            Logger.error('MongoDB health check failed', {}, error);
            return false;
        }
    }

    /**
     * 检查 DragonflyDB/Redis 连接
     */
    private static async checkDragonflyDB(): Promise<boolean> {
        try {
            const pong = await DragonflyDBService.ping();
            return pong;
        } catch (error) {
            Logger.error('DragonflyDB health check failed', {}, error);
            return false;
        }
    }

    /**
     * 获取系统信息
     */
    static getSystemInfo() {
        const uptime = Date.now() - this.startTime;
        const memoryUsage = process.memoryUsage();

        return {
            nodejs: {
                version: process.version,
                platform: process.platform,
                arch: process.arch,
            },
            process: {
                pid: process.pid,
                uptime: Math.floor(uptime / 1000),
                uptimeFormatted: this.formatUptime(uptime),
            },
            memory: {
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024),
            },
            environment: process.env.NODE_ENV || 'development',
        };
    }

    /**
     * 格式化运行时间
     */
    private static formatUptime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }
}
