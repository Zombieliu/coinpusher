import * as net from 'net';

/**
 * 🔒 IP Whitelist / Geo-Location Based Access Control
 *
 * 功能:
 * 1. IP 白名单验证
 * 2. CIDR 范围支持 (例如: 192.168.1.0/24)
 * 3. 异地登录检测和告警
 * 4. 可疑 IP 记录和封禁
 *
 * 使用场景:
 * - 限制管理员只能从特定 IP/网段登录
 * - 检测异地登录尝试
 * - 记录可疑访问日志
 */

export interface IPAccessLog {
    ip: string;
    adminId: string;
    action: string;
    allowed: boolean;
    timestamp: number;
    geoLocation?: {
        country?: string;
        city?: string;
    };
}

export class IPWhitelist {
    private static readonly whitelistByAdmin = new Map<string, Set<string>>();
    private static readonly globalWhitelist = new Set<string>();
    private static readonly blacklist = new Set<string>();
    private static readonly accessLogs: IPAccessLog[] = [];
    private static readonly MAX_LOG_SIZE = 10000;

    // 环境变量配置
    private static readonly ENABLE_IP_WHITELIST = process.env.ENABLE_IP_WHITELIST === 'true';
    private static readonly ENABLE_GEO_CHECK = process.env.ENABLE_GEO_CHECK === 'true';

    /**
     * 🔒 初始化全局白名单 (从环境变量或配置文件)
     */
    static initialize(): void {
        // 从环境变量读取全局白名单
        const globalIPs = process.env.ADMIN_IP_WHITELIST?.split(',') || [];
        globalIPs.forEach(ip => {
            const trimmedIP = ip.trim();
            if (trimmedIP) {
                this.globalWhitelist.add(trimmedIP);
            }
        });

        // 本地开发环境默认白名单
        if (process.env.NODE_ENV !== 'production') {
            this.globalWhitelist.add('127.0.0.1');
            this.globalWhitelist.add('::1');
            this.globalWhitelist.add('localhost');
        }

        console.log(`🔒 [IPWhitelist] Initialized with ${this.globalWhitelist.size} global IPs`);
    }

    /**
     * 🔒 检查 IP 是否允许访问
     * @param ip 客户端 IP
     * @param adminId 管理员 ID (可选，用于检查个人白名单)
     * @returns 是否允许
     */
    static isAllowed(ip: string, adminId?: string): {
        allowed: boolean;
        reason?: string;
    } {
        // 如果未启用白名单，默认允许
        if (!this.ENABLE_IP_WHITELIST) {
            return { allowed: true, reason: 'IP whitelist disabled' };
        }

        // 规范化 IP (IPv6 ::ffff:127.0.0.1 -> 127.0.0.1)
        const normalizedIP = this.normalizeIP(ip);

        // 检查黑名单
        if (this.blacklist.has(normalizedIP)) {
            return { allowed: false, reason: 'IP is blacklisted' };
        }

        // 检查全局白名单
        if (this.isIPInWhitelist(normalizedIP, this.globalWhitelist)) {
            return { allowed: true, reason: 'IP in global whitelist' };
        }

        // 检查管理员个人白名单
        if (adminId) {
            const adminWhitelist = this.whitelistByAdmin.get(adminId);
            if (adminWhitelist && this.isIPInWhitelist(normalizedIP, adminWhitelist)) {
                return { allowed: true, reason: 'IP in admin whitelist' };
            }
        }

        return { allowed: false, reason: 'IP not in whitelist' };
    }

    /**
     * 🔒 检查 IP 是否在白名单中 (支持 CIDR)
     * @param ip IP 地址
     * @param whitelist 白名单集合
     */
    private static isIPInWhitelist(ip: string, whitelist: Set<string>): boolean {
        // 精确匹配
        if (whitelist.has(ip)) {
            return true;
        }

        // CIDR 范围匹配
        for (const entry of whitelist) {
            if (entry.includes('/')) {
                if (this.isIPInCIDR(ip, entry)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 🔒 检查 IP 是否在 CIDR 范围内
     * @param ip IP 地址
     * @param cidr CIDR 表示法 (例如: 192.168.1.0/24)
     */
    private static isIPInCIDR(ip: string, cidr: string): boolean {
        try {
            const [range, bits] = cidr.split('/');
            const mask = -1 << (32 - parseInt(bits));

            const ipInt = this.ipToInt(ip);
            const rangeInt = this.ipToInt(range);

            return (ipInt & mask) === (rangeInt & mask);
        } catch (error) {
            console.error(`[IPWhitelist] Invalid CIDR: ${cidr}`, error);
            return false;
        }
    }

    /**
     * 🔒 IP 地址转整数
     */
    private static ipToInt(ip: string): number {
        const parts = ip.split('.');
        return parts.reduce((acc, part) => (acc << 8) + parseInt(part), 0) >>> 0;
    }

    /**
     * 🔒 规范化 IP (处理 IPv6 映射的 IPv4)
     */
    private static normalizeIP(ip: string): string {
        // IPv6 mapped IPv4: ::ffff:192.168.1.1 -> 192.168.1.1
        if (ip.startsWith('::ffff:')) {
            return ip.substring(7);
        }
        return ip;
    }

    /**
     * 🔒 添加全局白名单 IP
     */
    static addGlobalIP(ip: string): void {
        this.globalWhitelist.add(this.normalizeIP(ip));
        console.log(`🔒 [IPWhitelist] Added global IP: ${ip}`);
    }

    /**
     * 🔒 添加管理员个人白名单 IP
     */
    static addAdminIP(adminId: string, ip: string): void {
        if (!this.whitelistByAdmin.has(adminId)) {
            this.whitelistByAdmin.set(adminId, new Set());
        }
        this.whitelistByAdmin.get(adminId)!.add(this.normalizeIP(ip));
        console.log(`🔒 [IPWhitelist] Added IP for admin ${adminId}: ${ip}`);
    }

    /**
     * 🔒 移除全局白名单 IP
     */
    static removeGlobalIP(ip: string): void {
        this.globalWhitelist.delete(this.normalizeIP(ip));
        console.log(`🔒 [IPWhitelist] Removed global IP: ${ip}`);
    }

    /**
     * 🔒 移除管理员个人白名单 IP
     */
    static removeAdminIP(adminId: string, ip: string): void {
        const adminWhitelist = this.whitelistByAdmin.get(adminId);
        if (adminWhitelist) {
            adminWhitelist.delete(this.normalizeIP(ip));
        }
    }

    /**
     * 🔒 添加到黑名单
     */
    static addToBlacklist(ip: string, reason?: string): void {
        this.blacklist.add(this.normalizeIP(ip));
        console.warn(`⚠️ [IPWhitelist] Blacklisted IP: ${ip} - ${reason || 'No reason'}`);
    }

    /**
     * 🔒 从黑名单移除
     */
    static removeFromBlacklist(ip: string): void {
        this.blacklist.delete(this.normalizeIP(ip));
    }

    /**
     * 🔒 记录访问日志
     */
    static logAccess(
        ip: string,
        adminId: string,
        action: string,
        allowed: boolean,
        geoLocation?: { country?: string; city?: string }
    ): void {
        const log: IPAccessLog = {
            ip: this.normalizeIP(ip),
            adminId,
            action,
            allowed,
            timestamp: Date.now(),
            geoLocation
        };

        this.accessLogs.push(log);

        // 限制日志大小
        if (this.accessLogs.length > this.MAX_LOG_SIZE) {
            this.accessLogs.shift();
        }

        // 如果是拒绝访问，记录警告
        if (!allowed) {
            console.warn(`⚠️ [IPWhitelist] Access denied: ${ip} -> ${adminId} (${action})`);
        }
    }

    /**
     * 🔒 检测异地登录 (需要集成地理位置 API)
     */
    static async detectAnomalousLogin(
        adminId: string,
        ip: string,
        lastLoginIP?: string
    ): Promise<{
        isAnomalous: boolean;
        reason?: string;
        distance?: number;
    }> {
        if (!this.ENABLE_GEO_CHECK || !lastLoginIP) {
            return { isAnomalous: false };
        }

        // 如果 IP 相同，不是异常
        if (this.normalizeIP(ip) === this.normalizeIP(lastLoginIP)) {
            return { isAnomalous: false };
        }

        // TODO: 集成地理位置服务 (例如 MaxMind GeoIP2)
        // 计算两个 IP 的地理距离
        // 如果距离超过阈值 (例如 500km)，标记为异常

        return {
            isAnomalous: true,
            reason: 'IP address changed (geo-location check not implemented)'
        };
    }

    /**
     * 🔒 获取访问日志
     */
    static getAccessLogs(
        filter?: {
            adminId?: string;
            ip?: string;
            allowed?: boolean;
            startTime?: number;
            endTime?: number;
        }
    ): IPAccessLog[] {
        let logs = this.accessLogs;

        if (filter) {
            logs = logs.filter(log => {
                if (filter.adminId && log.adminId !== filter.adminId) return false;
                if (filter.ip && log.ip !== this.normalizeIP(filter.ip)) return false;
                if (filter.allowed !== undefined && log.allowed !== filter.allowed) return false;
                if (filter.startTime && log.timestamp < filter.startTime) return false;
                if (filter.endTime && log.timestamp > filter.endTime) return false;
                return true;
            });
        }

        return logs;
    }

    /**
     * 🔒 获取管理员的白名单 IP 列表
     */
    static getAdminWhitelist(adminId: string): string[] {
        return Array.from(this.whitelistByAdmin.get(adminId) || []);
    }

    /**
     * 🔒 获取全局白名单
     */
    static getGlobalWhitelist(): string[] {
        return Array.from(this.globalWhitelist);
    }

    /**
     * 🔒 获取黑名单
     */
    static getBlacklist(): string[] {
        return Array.from(this.blacklist);
    }

    /**
     * 🔒 获取统计信息
     */
    static getStats(): {
        globalWhitelistSize: number;
        adminWhitelistCount: number;
        blacklistSize: number;
        totalAccessLogs: number;
        deniedAccessCount: number;
    } {
        const deniedAccessCount = this.accessLogs.filter(log => !log.allowed).length;

        return {
            globalWhitelistSize: this.globalWhitelist.size,
            adminWhitelistCount: this.whitelistByAdmin.size,
            blacklistSize: this.blacklist.size,
            totalAccessLogs: this.accessLogs.length,
            deniedAccessCount
        };
    }
}

// 启动时初始化
IPWhitelist.initialize();
