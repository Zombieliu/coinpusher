/**
 * 🔒 Enhanced DOS (Denial of Service) Protection
 *
 * 多层防护措施:
 * 1. 连接数限制 (per IP, global)
 * 2. 请求频率限制 (rate limiting)
 * 3. 请求大小限制 (payload size)
 * 4. 慢速攻击检测 (Slowloris)
 * 5. 自动封禁恶意 IP
 *
 * 防护目标:
 * - 防止资源耗尽
 * - 保护服务可用性
 * - 检测和阻止攻击者
 */

export interface ConnectionInfo {
    ip: string;
    connectedAt: number;
    lastActivity: number;
    requestCount: number;
    bytesReceived: number;
    bytesSent: number;
    warnings: number;
}

export interface DOSMetrics {
    totalConnections: number;
    activeConnections: number;
    rejectedConnections: number;
    blockedIPs: number;
    requestsPerSecond: number;
    averageRequestSize: number;
}

export class DOSProtection {
    // 连接管理
    private static readonly connections = new Map<string, ConnectionInfo>();
    private static readonly blockedIPs = new Map<string, number>(); // IP -> unblock timestamp

    // 限制配置
    private static readonly MAX_CONNECTIONS_PER_IP = parseInt(process.env.MAX_CONNECTIONS_PER_IP || '10');
    private static readonly MAX_TOTAL_CONNECTIONS = parseInt(process.env.MAX_TOTAL_CONNECTIONS || '1000');
    private static readonly MAX_REQUEST_SIZE_BYTES = parseInt(process.env.MAX_REQUEST_SIZE_BYTES || '1048576'); // 1MB
    private static readonly MAX_REQUESTS_PER_SECOND = parseInt(process.env.MAX_REQUESTS_PER_SECOND || '100');
    private static readonly SLOWLORIS_TIMEOUT_MS = parseInt(process.env.SLOWLORIS_TIMEOUT_MS || '30000'); // 30s
    private static readonly BLOCK_DURATION_MS = parseInt(process.env.IP_BLOCK_DURATION_MS || '3600000'); // 1h
    private static readonly WARNING_THRESHOLD = 3; // 警告次数超过此值则封禁

    // 统计数据
    private static totalConnections = 0;
    private static rejectedConnections = 0;
    private static requestCounter = 0;
    private static lastSecond = Math.floor(Date.now() / 1000);
    private static requestsThisSecond = 0;

    /**
     * 🔒 检查是否允许新连接
     * @param ip 客户端 IP
     * @returns 是否允许
     */
    static canConnect(ip: string): {
        allowed: boolean;
        reason?: string;
    } {
        // 检查是否被封禁
        const blockExpiry = this.blockedIPs.get(ip);
        if (blockExpiry && blockExpiry > Date.now()) {
            const remainingMinutes = Math.ceil((blockExpiry - Date.now()) / 60000);
            return {
                allowed: false,
                reason: `IP blocked for ${remainingMinutes} more minutes`
            };
        } else if (blockExpiry) {
            // 封禁已过期，移除
            this.blockedIPs.delete(ip);
        }

        // 检查全局连接数限制
        if (this.connections.size >= this.MAX_TOTAL_CONNECTIONS) {
            this.rejectedConnections++;
            return {
                allowed: false,
                reason: 'Server connection limit reached'
            };
        }

        // 检查单 IP 连接数限制
        const ipConnections = Array.from(this.connections.values()).filter(
            conn => conn.ip === ip
        );

        if (ipConnections.length >= this.MAX_CONNECTIONS_PER_IP) {
            this.rejectedConnections++;
            this.warnIP(ip, 'Too many connections');
            return {
                allowed: false,
                reason: `Too many connections from your IP (max: ${this.MAX_CONNECTIONS_PER_IP})`
            };
        }

        return { allowed: true };
    }

    /**
     * 🔒 注册新连接
     * @param connectionId 连接 ID
     * @param ip 客户端 IP
     */
    static registerConnection(connectionId: string, ip: string): void {
        const now = Date.now();
        this.connections.set(connectionId, {
            ip,
            connectedAt: now,
            lastActivity: now,
            requestCount: 0,
            bytesReceived: 0,
            bytesSent: 0,
            warnings: 0
        });

        this.totalConnections++;
        console.log(`🔒 [DOSProtection] Connection registered: ${ip} (total: ${this.connections.size})`);
    }

    /**
     * 🔒 注销连接
     * @param connectionId 连接 ID
     */
    static unregisterConnection(connectionId: string): void {
        const conn = this.connections.get(connectionId);
        if (conn) {
            this.connections.delete(connectionId);
            console.log(`🔒 [DOSProtection] Connection closed: ${conn.ip} (total: ${this.connections.size})`);
        }
    }

    /**
     * 🔒 验证请求大小
     * @param size 请求大小 (bytes)
     * @returns 是否允许
     */
    static validateRequestSize(size: number): {
        allowed: boolean;
        reason?: string;
    } {
        if (size > this.MAX_REQUEST_SIZE_BYTES) {
            return {
                allowed: false,
                reason: `Request too large (max: ${this.MAX_REQUEST_SIZE_BYTES} bytes)`
            };
        }

        return { allowed: true };
    }

    /**
     * 🔒 记录请求
     * @param connectionId 连接 ID
     * @param bytesReceived 接收字节数
     * @param bytesSent 发送字节数
     */
    static recordRequest(
        connectionId: string,
        bytesReceived: number = 0,
        bytesSent: number = 0
    ): void {
        const conn = this.connections.get(connectionId);
        if (!conn) return;

        const now = Date.now();
        conn.lastActivity = now;
        conn.requestCount++;
        conn.bytesReceived += bytesReceived;
        conn.bytesSent += bytesSent;

        this.requestCounter++;

        // 更新每秒请求计数
        const currentSecond = Math.floor(now / 1000);
        if (currentSecond !== this.lastSecond) {
            this.lastSecond = currentSecond;
            this.requestsThisSecond = 1;
        } else {
            this.requestsThisSecond++;
        }

        // 检查是否超过频率限制
        if (this.requestsThisSecond > this.MAX_REQUESTS_PER_SECOND) {
            this.warnIP(conn.ip, 'Rate limit exceeded');
        }
    }

    /**
     * 🔒 检测慢速攻击 (Slowloris)
     */
    static detectSlowlorisAttack(): void {
        const now = Date.now();
        const suspiciousConnections: string[] = [];

        for (const [connectionId, conn] of this.connections.entries()) {
            // 连接空闲时间过长
            const idleTime = now - conn.lastActivity;
            if (idleTime > this.SLOWLORIS_TIMEOUT_MS) {
                suspiciousConnections.push(connectionId);
                this.warnIP(conn.ip, 'Slowloris attack suspected');
            }

            // 请求数异常少但保持连接
            const connectedTime = now - conn.connectedAt;
            if (connectedTime > 60000 && conn.requestCount < 2) {
                // 连接超过1分钟但请求少于2次
                suspiciousConnections.push(connectionId);
                this.warnIP(conn.ip, 'Suspicious idle connection');
            }
        }

        // 断开可疑连接
        suspiciousConnections.forEach(id => {
            this.unregisterConnection(id);
            console.warn(`⚠️ [DOSProtection] Disconnected suspicious connection: ${id}`);
        });
    }

    /**
     * 🔒 警告 IP (累计警告后封禁)
     * @param ip IP 地址
     * @param reason 原因
     */
    private static warnIP(ip: string, reason: string): void {
        // 统计该 IP 的所有连接的警告次数
        let totalWarnings = 0;
        for (const conn of this.connections.values()) {
            if (conn.ip === ip) {
                conn.warnings++;
                totalWarnings += conn.warnings;
            }
        }

        console.warn(`⚠️ [DOSProtection] Warning for IP ${ip}: ${reason} (total warnings: ${totalWarnings})`);

        // 超过警告阈值，封禁 IP
        if (totalWarnings >= this.WARNING_THRESHOLD) {
            this.blockIP(ip, reason);
        }
    }

    /**
     * 🔒 封禁 IP
     * @param ip IP 地址
     * @param reason 原因
     */
    static blockIP(ip: string, reason: string): void {
        const unblockTime = Date.now() + this.BLOCK_DURATION_MS;
        this.blockedIPs.set(ip, unblockTime);

        // 断开该 IP 的所有连接
        for (const [connectionId, conn] of this.connections.entries()) {
            if (conn.ip === ip) {
                this.unregisterConnection(connectionId);
            }
        }

        console.error(`🚫 [DOSProtection] IP blocked: ${ip} - ${reason} (until ${new Date(unblockTime).toISOString()})`);
    }

    /**
     * 🔒 手动解封 IP
     * @param ip IP 地址
     */
    static unblockIP(ip: string): void {
        this.blockedIPs.delete(ip);
        console.log(`🔒 [DOSProtection] IP unblocked: ${ip}`);
    }

    /**
     * 🔒 获取连接信息
     * @param connectionId 连接 ID
     */
    static getConnectionInfo(connectionId: string): ConnectionInfo | undefined {
        return this.connections.get(connectionId);
    }

    /**
     * 🔒 获取 IP 的所有连接
     * @param ip IP 地址
     */
    static getIPConnections(ip: string): ConnectionInfo[] {
        const ipConnections: ConnectionInfo[] = [];
        for (const conn of this.connections.values()) {
            if (conn.ip === ip) {
                ipConnections.push(conn);
            }
        }
        return ipConnections;
    }

    /**
     * 🔒 获取统计信息
     */
    static getMetrics(): DOSMetrics {
        const now = Date.now();
        const activeConnections = Array.from(this.connections.values()).filter(
            conn => now - conn.lastActivity < 60000 // 活跃 = 最近1分钟有活动
        );

        const totalBytes = Array.from(this.connections.values()).reduce(
            (sum, conn) => sum + conn.bytesReceived,
            0
        );

        return {
            totalConnections: this.totalConnections,
            activeConnections: activeConnections.length,
            rejectedConnections: this.rejectedConnections,
            blockedIPs: this.blockedIPs.size,
            requestsPerSecond: this.requestsThisSecond,
            averageRequestSize: this.requestCounter > 0 ? Math.round(totalBytes / this.requestCounter) : 0
        };
    }

    /**
     * 🔒 获取被封禁的 IP 列表
     */
    static getBlockedIPs(): Array<{ ip: string; unblockAt: number }> {
        const now = Date.now();
        const blocked: Array<{ ip: string; unblockAt: number }> = [];

        for (const [ip, unblockTime] of this.blockedIPs.entries()) {
            if (unblockTime > now) {
                blocked.push({ ip, unblockAt: unblockTime });
            } else {
                // 清理过期的封禁
                this.blockedIPs.delete(ip);
            }
        }

        return blocked;
    }

    /**
     * 🔒 清理过期数据
     */
    static cleanup(): void {
        const now = Date.now();

        // 清理过期封禁
        for (const [ip, unblockTime] of this.blockedIPs.entries()) {
            if (unblockTime <= now) {
                this.blockedIPs.delete(ip);
            }
        }

        // 清理僵尸连接 (超过5分钟无活动)
        for (const [connectionId, conn] of this.connections.entries()) {
            if (now - conn.lastActivity > 300000) {
                this.unregisterConnection(connectionId);
            }
        }
    }

    /**
     * 🔒 重置统计数据
     */
    static resetStats(): void {
        this.totalConnections = 0;
        this.rejectedConnections = 0;
        this.requestCounter = 0;
        console.log('🔒 [DOSProtection] Statistics reset');
    }
}

// 定期清理和检测
setInterval(() => {
    DOSProtection.cleanup();
    DOSProtection.detectSlowlorisAttack();
}, 60000); // 每分钟执行一次

/**
 * 🔒 使用示例
 *
 * ```typescript
 * // 在 WebSocket 连接时
 * const canConnect = DOSProtection.canConnect(clientIP);
 * if (!canConnect.allowed) {
 *   connection.close(1008, canConnect.reason);
 *   return;
 * }
 *
 * DOSProtection.registerConnection(connectionId, clientIP);
 *
 * // 在接收消息时
 * const sizeCheck = DOSProtection.validateRequestSize(message.length);
 * if (!sizeCheck.allowed) {
 *   connection.close(1009, sizeCheck.reason);
 *   return;
 * }
 *
 * DOSProtection.recordRequest(connectionId, message.length);
 *
 * // 在断开连接时
 * DOSProtection.unregisterConnection(connectionId);
 * ```
 */
