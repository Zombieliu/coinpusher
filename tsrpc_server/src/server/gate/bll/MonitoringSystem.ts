/**
 * 实时监控系统
 * 监控服务器健康状态、业务指标、异常情况
 */

import * as os from 'os';
import { Db } from 'mongodb';

export interface ServerMetrics {
    timestamp: number;
    cpu: {
        usage: number;          // CPU使用率 0-100
        cores: number;          // CPU核心数
        loadAverage: number[];  // 负载均衡 [1min, 5min, 15min]
    };
    memory: {
        total: number;          // 总内存 (bytes)
        used: number;           // 已用内存
        free: number;           // 空闲内存
        usage: number;          // 使用率 0-100
    };
    connections: {
        active: number;         // 活跃连接数
        total: number;          // 总连接数
    };
    requests: {
        qps: number;           // 每秒请求数
        avgResponseTime: number; // 平均响应时间(ms)
        errorRate: number;     // 错误率 0-100
    };
}

export interface BusinessMetrics {
    timestamp: number;
    users: {
        online: number;         // 在线用户数
        dau: number;           // 日活
        newToday: number;      // 今日新增
    };
    game: {
        activeMatches: number;  // 活跃游戏数
        totalMatches: number;   // 总游戏数
        avgGameTime: number;    // 平均游戏时长(秒)
    };
    revenue: {
        todayRevenue: number;   // 今日收入
        orderCount: number;     // 订单数
        payRate: number;        // 付费率
    };
    errors: {
        gameErrors: number;     // 游戏错误数
        paymentErrors: number;  // 支付错误数
        serverErrors: number;   // 服务器错误数
    };
}

export interface Alert {
    id: string;
    type: 'cpu' | 'memory' | 'error_rate' | 'payment_failure' | 'custom';
    level: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    value: number;
    threshold: number;
    timestamp: number;
    resolved: boolean;
    resolvedAt?: number;
}

export class MonitoringSystem {
    private static db: Db;
    private static metrics: {
        requests: Map<string, { count: number; totalTime: number; errors: number }>;
        lastReset: number;
    } = {
        requests: new Map(),
        lastReset: Date.now(),
    };
    private static alerts: Alert[] = [];

    static async initialize(db: Db) {
        this.db = db;
        console.log('[监控系统] 已初始化');

        // 启动定时任务
        this.startMetricsCollection();
    }

    /**
     * 启动指标收集
     */
    private static startMetricsCollection() {
        // 每30秒收集一次指标
        setInterval(() => {
            this.collectAndCheckMetrics();
        }, 30000);
    }

    /**
     * 收集并检查指标
     */
    private static async collectAndCheckMetrics() {
        const serverMetrics = this.getServerMetrics();
        const businessMetrics = await this.getBusinessMetrics();

        // 检查告警
        this.checkAlerts(serverMetrics, businessMetrics);
    }

    /**
     * 获取服务器指标
     */
    static getServerMetrics(): ServerMetrics {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        // 计算CPU使用率
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type as keyof typeof cpu.times];
            }
            totalIdle += cpu.times.idle;
        });
        const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);

        // 计算QPS和错误率
        const now = Date.now();
        const timeDiff = (now - this.metrics.lastReset) / 1000; // 秒

        let totalRequests = 0;
        let totalTime = 0;
        let totalErrors = 0;

        this.metrics.requests.forEach(stat => {
            totalRequests += stat.count;
            totalTime += stat.totalTime;
            totalErrors += stat.errors;
        });

        const qps = timeDiff > 0 ? totalRequests / timeDiff : 0;
        const avgResponseTime = totalRequests > 0 ? totalTime / totalRequests : 0;
        const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

        return {
            timestamp: now,
            cpu: {
                usage: cpuUsage,
                cores: cpus.length,
                loadAverage: os.loadavg(),
            },
            memory: {
                total: totalMem,
                used: usedMem,
                free: freeMem,
                usage: (usedMem / totalMem) * 100,
            },
            connections: {
                active: 0, // TODO: 需要从实际连接池获取
                total: 0,
            },
            requests: {
                qps,
                avgResponseTime,
                errorRate,
            },
        };
    }

    /**
     * 获取业务指标
     */
    static async getBusinessMetrics(): Promise<BusinessMetrics> {
        const now = Date.now();
        const todayStart = new Date().setHours(0, 0, 0, 0);

        try {
            // 在线用户数（假设有sessions collection）
            const onlineUsers = await this.db.collection('sessions')
                .countDocuments({
                    lastActiveAt: { $gte: now - 5 * 60 * 1000 } // 5分钟内活跃
                });

            // 今日新增用户
            const newUsersToday = await this.db.collection('users')
                .countDocuments({
                    createdAt: { $gte: todayStart }
                });

            // 今日收入
            const revenueResult = await this.db.collection('payment_orders')
                .aggregate([
                    {
                        $match: {
                            status: 'completed',
                            completedAt: { $gte: todayStart }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' },
                            count: { $sum: 1 }
                        }
                    }
                ]).toArray();

            const todayRevenue = revenueResult[0]?.total || 0;
            const orderCount = revenueResult[0]?.count || 0;

            return {
                timestamp: now,
                users: {
                    online: onlineUsers,
                    dau: 0, // TODO: 需要从实际数据计算
                    newToday: newUsersToday,
                },
                game: {
                    activeMatches: 0, // TODO: 从游戏服务器获取
                    totalMatches: 0,
                    avgGameTime: 0,
                },
                revenue: {
                    todayRevenue,
                    orderCount,
                    payRate: 0,
                },
                errors: {
                    gameErrors: 0,
                    paymentErrors: 0,
                    serverErrors: 0,
                },
            };
        } catch (error) {
            console.error('[MonitoringSystem] 获取业务指标失败:', error);
            return {
                timestamp: now,
                users: { online: 0, dau: 0, newToday: 0 },
                game: { activeMatches: 0, totalMatches: 0, avgGameTime: 0 },
                revenue: { todayRevenue: 0, orderCount: 0, payRate: 0 },
                errors: { gameErrors: 0, paymentErrors: 0, serverErrors: 0 },
            };
        }
    }

    /**
     * 检查告警
     */
    private static checkAlerts(server: ServerMetrics, business: BusinessMetrics) {
        // CPU告警
        if (server.cpu.usage > 80) {
            this.createAlert({
                type: 'cpu',
                level: server.cpu.usage > 90 ? 'critical' : 'warning',
                title: 'CPU使用率过高',
                message: `CPU使用率达到 ${server.cpu.usage.toFixed(1)}%`,
                value: server.cpu.usage,
                threshold: 80,
            });
        }

        // 内存告警
        if (server.memory.usage > 85) {
            this.createAlert({
                type: 'memory',
                level: server.memory.usage > 95 ? 'critical' : 'warning',
                title: '内存使用率过高',
                message: `内存使用率达到 ${server.memory.usage.toFixed(1)}%`,
                value: server.memory.usage,
                threshold: 85,
            });
        }

        // 错误率告警
        if (server.requests.errorRate > 5) {
            this.createAlert({
                type: 'error_rate',
                level: server.requests.errorRate > 10 ? 'critical' : 'warning',
                title: '错误率过高',
                message: `接口错误率达到 ${server.requests.errorRate.toFixed(1)}%`,
                value: server.requests.errorRate,
                threshold: 5,
            });
        }
    }

    /**
     * 创建告警
     */
    private static createAlert(params: Omit<Alert, 'id' | 'timestamp' | 'resolved'>) {
        const alert: Alert = {
            ...params,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            resolved: false,
        };

        // 避免重复告警（同类型未解决的告警）
        const existingAlert = this.alerts.find(
            a => !a.resolved && a.type === alert.type && a.level === alert.level
        );

        if (!existingAlert) {
            this.alerts.push(alert);
            console.warn(`[告警] ${alert.level.toUpperCase()}: ${alert.title} - ${alert.message}`);
        }
    }

    /**
     * 获取未解决的告警
     */
    static getActiveAlerts(): Alert[] {
        return this.alerts.filter(a => !a.resolved);
    }

    /**
     * 获取所有告警
     */
    static getAllAlerts(limit = 100): Alert[] {
        return this.alerts.slice(-limit);
    }

    /**
     * 解决告警
     */
    static resolveAlert(alertId: string): boolean {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert && !alert.resolved) {
            alert.resolved = true;
            alert.resolvedAt = Date.now();
            return true;
        }
        return false;
    }

    /**
     * 记录API请求
     */
    static recordRequest(apiPath: string, responseTime: number, isError: boolean) {
        const stat = this.metrics.requests.get(apiPath) || { count: 0, totalTime: 0, errors: 0 };
        stat.count++;
        stat.totalTime += responseTime;
        if (isError) stat.errors++;
        this.metrics.requests.set(apiPath, stat);
    }

    /**
     * 重置请求统计
     */
    static resetRequestStats() {
        this.metrics.requests.clear();
        this.metrics.lastReset = Date.now();
    }
}
