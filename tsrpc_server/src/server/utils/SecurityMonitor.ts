/**
 * 🔒 Real-Time Security Monitoring System
 *
 * 实时检测和响应安全威胁:
 * - 异常行为检测
 * - 攻击模式识别
 * - 自动响应措施
 * - 安全事件聚合
 * - 实时告警
 *
 * 监控指标:
 * - 失败登录次数
 * - 异常请求模式
 * - 资源消耗异常
 * - 权限提升尝试
 * - 数据泄露尝试
 */

export enum ThreatLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum ThreatType {
    BRUTE_FORCE = 'brute_force',
    DOS_ATTACK = 'dos_attack',
    SQL_INJECTION = 'sql_injection',
    XSS_ATTEMPT = 'xss_attempt',
    CSRF_ATTACK = 'csrf_attack',
    SESSION_HIJACKING = 'session_hijacking',
    PRIVILEGE_ESCALATION = 'privilege_escalation',
    DATA_EXFILTRATION = 'data_exfiltration',
    UNAUTHORIZED_ACCESS = 'unauthorized_access',
    SUSPICIOUS_ACTIVITY = 'suspicious_activity'
}

export interface SecurityEvent {
    id: string;
    timestamp: number;
    type: ThreatType;
    level: ThreatLevel;
    source: string;                // IP地址或用户ID
    target?: string;                // 目标资源
    details: any;
    blocked: boolean;
    autoResponse?: string;          // 自动响应措施
}

export interface ThreatPattern {
    type: ThreatType;
    indicators: Array<{
        metric: string;
        threshold: number;
        timeWindow: number;         // 毫秒
    }>;
    response: 'log' | 'block' | 'alert';
}

export interface MonitoringStats {
    totalEvents: number;
    eventsByLevel: Record<ThreatLevel, number>;
    eventsByType: Record<ThreatType, number>;
    blockedEvents: number;
    recentEvents: SecurityEvent[];
}

export class SecurityMonitor {
    static enabled = process.env.SECURITY_MONITOR_ENABLED !== 'false';
    private static events: SecurityEvent[] = [];
    private static readonly MAX_EVENTS = 10000;

    // 威胁模式配置
    private static readonly THREAT_PATTERNS: ThreatPattern[] = [
        {
            type: ThreatType.BRUTE_FORCE,
            indicators: [
                { metric: 'failed_login', threshold: 5, timeWindow: 5 * 60 * 1000 }  // 5分钟内5次失败
            ],
            response: 'block'
        },
        {
            type: ThreatType.DOS_ATTACK,
            indicators: [
                { metric: 'requests', threshold: 100, timeWindow: 10 * 1000 }  // 10秒内100次请求
            ],
            response: 'block'
        },
        {
            type: ThreatType.SQL_INJECTION,
            indicators: [
                { metric: 'sql_keywords', threshold: 1, timeWindow: 1000 }
            ],
            response: 'block'
        },
        {
            type: ThreatType.XSS_ATTEMPT,
            indicators: [
                { metric: 'script_tags', threshold: 1, timeWindow: 1000 }
            ],
            response: 'block'
        }
    ];

    // 活动指标追踪
    private static metrics: Map<string, Array<{ timestamp: number; value: number }>> = new Map();

    /**
     * 🔒 记录安全事件
     */
    static logEvent(
        type: ThreatType,
        level: ThreatLevel,
        source: string,
        details: any,
        options?: {
            target?: string;
            blocked?: boolean;
            autoResponse?: string;
        }
    ): SecurityEvent {
        if (!this.enabled) {
            return {
                id: 'disabled',
                timestamp: Date.now(),
                type,
                level,
                source,
                target: options?.target,
                details,
                blocked: false
            };
        }

        const event: SecurityEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type,
            level,
            source,
            target: options?.target,
            details,
            blocked: options?.blocked || false,
            autoResponse: options?.autoResponse
        };

        this.events.push(event);

        // 限制事件数量
        if (this.events.length > this.MAX_EVENTS) {
            this.events.shift();
        }

        // 输出日志
        const logLevel = level === ThreatLevel.CRITICAL || level === ThreatLevel.HIGH ? 'error' : 'warn';
        console[logLevel](`🔒 [SecurityMonitor] ${level.toUpperCase()} - ${type}:`, {
            source,
            target: options?.target,
            blocked: options?.blocked
        });

        // 触发告警
        if (level === ThreatLevel.CRITICAL || level === ThreatLevel.HIGH) {
            this.triggerAlert(event);
        }

        return event;
    }

    /**
     * 🔒 记录指标
     */
    static recordMetric(metricName: string, value: number = 1): void {
        if (!this.metrics.has(metricName)) {
            this.metrics.set(metricName, []);
        }

        const metrics = this.metrics.get(metricName)!;
        metrics.push({ timestamp: Date.now(), value });

        // 清理旧数据 (保留1小时)
        const cutoff = Date.now() - 60 * 60 * 1000;
        while (metrics.length > 0 && metrics[0].timestamp < cutoff) {
            metrics.shift();
        }
    }

    /**
     * 🔒 检测威胁模式
     */
    static detectThreats(source: string): SecurityEvent[] {
        const detectedThreats: SecurityEvent[] = [];

        for (const pattern of this.THREAT_PATTERNS) {
            const isMatch = this.matchPattern(source, pattern);

            if (isMatch) {
                const event = this.logEvent(
                    pattern.type,
                    ThreatLevel.HIGH,
                    source,
                    { pattern: pattern.type },
                    {
                        blocked: pattern.response === 'block',
                        autoResponse: pattern.response
                    }
                );

                detectedThreats.push(event);

                // 执行响应
                this.executeResponse(pattern.response, source, pattern.type);
            }
        }

        return detectedThreats;
    }

    /**
     * 🔒 匹配威胁模式
     */
    private static matchPattern(source: string, pattern: ThreatPattern): boolean {
        for (const indicator of pattern.indicators) {
            const metricKey = `${source}:${indicator.metric}`;
            const metrics = this.metrics.get(metricKey) || [];

            const cutoff = Date.now() - indicator.timeWindow;
            const recentMetrics = metrics.filter(m => m.timestamp >= cutoff);

            const totalValue = recentMetrics.reduce((sum, m) => sum + m.value, 0);

            if (totalValue >= indicator.threshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * 🔒 执行响应措施
     */
    private static executeResponse(response: string, source: string, threatType: ThreatType): void {
        switch (response) {
            case 'block':
                // 自动封禁 (需要与其他安全模块集成)
                console.warn(`🔒 [SecurityMonitor] AUTO-BLOCK: ${source} (${threatType})`);
                // DOSProtection.blockIP(source, threatType);
                // IPWhitelist.addToBlacklist(source, threatType);
                break;

            case 'alert':
                // 发送告警
                this.triggerAlert({
                    id: 'auto_alert',
                    timestamp: Date.now(),
                    type: threatType,
                    level: ThreatLevel.HIGH,
                    source,
                    details: { autoResponse: true },
                    blocked: false
                });
                break;

            case 'log':
                // 仅记录
                break;
        }
    }

    /**
     * 🔒 触发告警
     */
    private static triggerAlert(event: SecurityEvent): void {
        // TODO: 集成告警系统 (Email, Slack, PagerDuty等)
        console.error(`🚨 [SecurityMonitor] ALERT - ${event.level.toUpperCase()}:`, {
            type: event.type,
            source: event.source,
            timestamp: new Date(event.timestamp).toISOString()
        });

        // 可以在这里集成:
        // - 发送邮件
        // - Slack通知
        // - PagerDuty
        // - SMS
    }

    /**
     * 🔒 分析用户行为异常
     */
    static analyzeUserBehavior(userId: string, action: string, metadata: any): {
        suspicious: boolean;
        reasons: string[];
    } {
        const reasons: string[] = [];
        let suspicious = false;

        // 1. 检查登录时间异常
        const currentHour = new Date().getHours();
        if (currentHour >= 2 && currentHour <= 5) {
            reasons.push('Login during unusual hours (2 AM - 5 AM)');
            suspicious = true;
        }

        // 2. 检查地理位置跳变 (需要GeoIP)
        if (metadata.previousIP && metadata.currentIP) {
            // TODO: 实现地理位置检查
            // if (distance > 500km && timeDiff < 1hour) {
            //   reasons.push('Impossible travel detected');
            //   suspicious = true;
            // }
        }

        // 3. 检查User-Agent变化
        if (metadata.previousUA && metadata.currentUA && metadata.previousUA !== metadata.currentUA) {
            reasons.push('User-Agent changed');
            suspicious = true;
        }

        // 4. 检查操作频率异常
        const metricKey = `${userId}:actions`;
        const recentActions = (this.metrics.get(metricKey) || []).filter(
            m => m.timestamp > Date.now() - 60 * 1000  // 最近1分钟
        );

        if (recentActions.length > 30) {
            reasons.push('Abnormally high activity rate');
            suspicious = true;
        }

        if (suspicious) {
            this.logEvent(
                ThreatType.SUSPICIOUS_ACTIVITY,
                ThreatLevel.MEDIUM,
                userId,
                { action, reasons },
                { blocked: false }
            );
        }

        return { suspicious, reasons };
    }

    /**
     * 🔒 检测数据泄露尝试
     */
    static detectDataExfiltration(userId: string, dataSize: number, endpoint: string): boolean {
        const threshold = 10 * 1024 * 1024;  // 10MB

        if (dataSize > threshold) {
            this.logEvent(
                ThreatType.DATA_EXFILTRATION,
                ThreatLevel.CRITICAL,
                userId,
                { dataSize, endpoint },
                { blocked: true, autoResponse: 'block_large_response' }
            );

            return true;
        }

        // 检查短时间内多次导出
        const metricKey = `${userId}:exports`;
        this.recordMetric(metricKey);

        const recentExports = (this.metrics.get(metricKey) || []).filter(
            m => m.timestamp > Date.now() - 10 * 60 * 1000  // 10分钟
        );

        if (recentExports.length > 5) {
            this.logEvent(
                ThreatType.DATA_EXFILTRATION,
                ThreatLevel.HIGH,
                userId,
                { exportCount: recentExports.length, endpoint },
                { blocked: false, autoResponse: 'alert' }
            );

            return true;
        }

        return false;
    }

    /**
     * 🔒 检测权限提升尝试
     */
    static detectPrivilegeEscalation(userId: string, attemptedAction: string, requiredRole: string): void {
        this.logEvent(
            ThreatType.PRIVILEGE_ESCALATION,
            ThreatLevel.HIGH,
            userId,
            { attemptedAction, requiredRole },
            { blocked: true, autoResponse: 'block_and_alert' }
        );
    }

    /**
     * 🔒 获取统计信息
     */
    static getStats(timeWindow?: number): MonitoringStats {
        const cutoff = timeWindow ? Date.now() - timeWindow : 0;
        const relevantEvents = this.events.filter(e => e.timestamp >= cutoff);

        const eventsByLevel: Record<ThreatLevel, number> = {
            [ThreatLevel.LOW]: 0,
            [ThreatLevel.MEDIUM]: 0,
            [ThreatLevel.HIGH]: 0,
            [ThreatLevel.CRITICAL]: 0
        };

        const eventsByType: Record<ThreatType, number> = {} as any;
        let blockedEvents = 0;

        for (const event of relevantEvents) {
            eventsByLevel[event.level]++;
            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
            if (event.blocked) blockedEvents++;
        }

        return {
            totalEvents: relevantEvents.length,
            eventsByLevel,
            eventsByType,
            blockedEvents,
            recentEvents: relevantEvents.slice(-20)  // 最近20个事件
        };
    }

    /**
     * 🔒 查询安全事件
     */
    static queryEvents(filter: {
        type?: ThreatType;
        level?: ThreatLevel;
        source?: string;
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): SecurityEvent[] {
        let events = this.events;

        if (filter.type) {
            events = events.filter(e => e.type === filter.type);
        }

        if (filter.level) {
            events = events.filter(e => e.level === filter.level);
        }

        if (filter.source) {
            events = events.filter(e => e.source === filter.source);
        }

        if (filter.startTime) {
            events = events.filter(e => e.timestamp >= filter.startTime!);
        }

        if (filter.endTime) {
            events = events.filter(e => e.timestamp <= filter.endTime!);
        }

        if (filter.limit) {
            events = events.slice(-filter.limit);
        }

        return events;
    }

    /**
     * 🔒 生成安全报告
     */
    static generateReport(period: number = 24 * 60 * 60 * 1000): {
        period: string;
        summary: MonitoringStats;
        topThreats: Array<{ type: ThreatType; count: number }>;
        topSources: Array<{ source: string; count: number }>;
        recommendations: string[];
    } {
        const stats = this.getStats(period);

        // 统计最高威胁类型
        const topThreats = Object.entries(stats.eventsByType)
            .map(([type, count]) => ({ type: type as ThreatType, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 统计最多攻击来源
        const sourceCounts: Record<string, number> = {};
        this.events.forEach(e => {
            sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
        });

        const topSources = Object.entries(sourceCounts)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 生成建议
        const recommendations: string[] = [];

        if (stats.eventsByLevel[ThreatLevel.CRITICAL] > 0) {
            recommendations.push('Critical threats detected - immediate action required');
        }

        if (stats.eventsByLevel[ThreatLevel.HIGH] > 10) {
            recommendations.push('High number of high-severity events - review security policies');
        }

        if (topThreats[0]?.type === ThreatType.BRUTE_FORCE) {
            recommendations.push('Enable 2FA for all accounts');
        }

        if (topThreats[0]?.type === ThreatType.DOS_ATTACK) {
            recommendations.push('Consider implementing CDN/DDoS protection');
        }

        return {
            period: `${period / 1000 / 60 / 60} hours`,
            summary: stats,
            topThreats,
            topSources,
            recommendations
        };
    }

    /**
     * 🔒 清理旧事件
     */
    static cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
        const cutoff = Date.now() - maxAge;
        const initialCount = this.events.length;

        this.events = this.events.filter(e => e.timestamp >= cutoff);

        const removed = initialCount - this.events.length;
        if (removed > 0) {
            console.log(`🔒 [SecurityMonitor] Cleaned up ${removed} old events`);
        }

        return removed;
    }
}

/**
 * 🔒 使用示例
 *
 * ```typescript
 * // 记录安全事件
 * SecurityMonitor.logEvent(
 *   ThreatType.BRUTE_FORCE,
 *   ThreatLevel.HIGH,
 *   '192.168.1.1',
 *   { attempts: 5 },
 *   { blocked: true }
 * );
 *
 * // 记录指标
 * SecurityMonitor.recordMetric('192.168.1.1:failed_login');
 *
 * // 检测威胁
 * const threats = SecurityMonitor.detectThreats('192.168.1.1');
 *
 * // 分析用户行为
 * const analysis = SecurityMonitor.analyzeUserBehavior(userId, 'login', { currentIP, currentUA });
 *
 * // 获取统计
 * const stats = SecurityMonitor.getStats(24 * 60 * 60 * 1000);  // 24小时
 *
 * // 生成报告
 * const report = SecurityMonitor.generateReport();
 * ```
 */

// 定期清理 (每天)
setInterval(() => {
    SecurityMonitor.cleanup();
}, 24 * 60 * 60 * 1000);
