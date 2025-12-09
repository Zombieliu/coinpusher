import * as crypto from 'crypto';

/**
 * 🔒 Session Fixation Attack Prevention
 *
 * 防止会话固定攻击:
 * 1. 登录成功后重新生成 Session ID
 * 2. 验证 Session 来源 IP
 * 3. 设置 HttpOnly + Secure Cookie
 * 4. 限制 Session 生命周期
 *
 * 安全措施:
 * - 登录前后 Session ID 不同
 * - IP 绑定检测 (可选)
 * - User-Agent 绑定检测 (可选)
 * - Session 过期自动销毁
 */

export interface SessionData {
    sessionId: string;
    adminId: string;
    username: string;
    role: string;
    createdAt: number;
    expiresAt: number;
    lastAccessAt: number;
    // 🔒 安全绑定字段
    originalIp?: string;      // 创建时的 IP
    currentIp?: string;        // 当前访问 IP
    userAgent?: string;        // User-Agent 指纹
    twoFactorVerified?: boolean;
}

export class SessionManager {
    private static readonly sessions = new Map<string, SessionData>();
    private static readonly SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24小时
    private static readonly MAX_IDLE_TIME_MS = 2 * 60 * 60 * 1000;     // 2小时无活动过期
    private static readonly ENABLE_IP_BINDING = process.env.ENABLE_SESSION_IP_BINDING === 'true';
    private static readonly ENABLE_UA_BINDING = process.env.ENABLE_SESSION_UA_BINDING === 'true';

    /**
     * 🔒 创建新 Session
     * @param adminId 管理员 ID
     * @param username 用户名
     * @param role 角色
     * @param ip 客户端 IP
     * @param userAgent User-Agent
     * @returns Session ID
     */
    static createSession(
        adminId: string,
        username: string,
        role: string,
        ip?: string,
        userAgent?: string
    ): string {
        // 生成安全随机 Session ID (64字符)
        const sessionId = crypto.randomBytes(32).toString('hex');

        const now = Date.now();
        const session: SessionData = {
            sessionId,
            adminId,
            username,
            role,
            createdAt: now,
            expiresAt: now + this.SESSION_LIFETIME_MS,
            lastAccessAt: now,
            originalIp: ip,
            currentIp: ip,
            userAgent,
            twoFactorVerified: false
        };

        this.sessions.set(sessionId, session);

        // 定期清理过期 Session
        this.cleanExpiredSessions();

        return sessionId;
    }

    /**
     * 🔒 重新生成 Session ID (登录成功后调用，防止会话固定攻击)
     * @param oldSessionId 旧的 Session ID
     * @returns 新的 Session ID
     */
    static regenerateSessionId(oldSessionId: string): string | null {
        const oldSession = this.sessions.get(oldSessionId);
        if (!oldSession) return null;

        // 生成新的 Session ID
        const newSessionId = crypto.randomBytes(32).toString('hex');

        // 复制旧 Session 数据到新 Session
        const newSession: SessionData = {
            ...oldSession,
            sessionId: newSessionId,
            createdAt: Date.now(), // 重置创建时间
            lastAccessAt: Date.now()
        };

        // 删除旧 Session
        this.sessions.delete(oldSessionId);

        // 创建新 Session
        this.sessions.set(newSessionId, newSession);

        console.log(`🔒 [SessionManager] Session ID regenerated for admin: ${oldSession.adminId}`);

        return newSessionId;
    }

    /**
     * 🔒 验证 Session
     * @param sessionId Session ID
     * @param ip 当前请求 IP
     * @param userAgent 当前 User-Agent
     * @returns 验证结果和 Session 数据
     */
    static validateSession(
        sessionId: string,
        ip?: string,
        userAgent?: string
    ): {
        valid: boolean;
        session?: SessionData;
        error?: string;
    } {
        const session = this.sessions.get(sessionId);

        // Session 不存在
        if (!session) {
            return { valid: false, error: 'Session not found' };
        }

        const now = Date.now();

        // Session 已过期
        if (session.expiresAt < now) {
            this.sessions.delete(sessionId);
            return { valid: false, error: 'Session expired' };
        }

        // Session 空闲超时
        if (now - session.lastAccessAt > this.MAX_IDLE_TIME_MS) {
            this.sessions.delete(sessionId);
            return { valid: false, error: 'Session idle timeout' };
        }

        // 🔒 IP 绑定检查 (如果启用)
        if (this.ENABLE_IP_BINDING && session.originalIp && ip && session.originalIp !== ip) {
            console.warn(`⚠️ [SessionManager] IP mismatch for session ${sessionId}: ${session.originalIp} -> ${ip}`);
            // 生产环境可以选择拒绝或记录告警
            return { valid: false, error: 'IP address mismatch' };
        }

        // 🔒 User-Agent 绑定检查 (如果启用)
        if (this.ENABLE_UA_BINDING && session.userAgent && userAgent && session.userAgent !== userAgent) {
            console.warn(`⚠️ [SessionManager] User-Agent mismatch for session ${sessionId}`);
            return { valid: false, error: 'User-Agent mismatch' };
        }

        // 更新最后访问时间和当前 IP
        session.lastAccessAt = now;
        session.currentIp = ip;

        return { valid: true, session };
    }

    /**
     * 🔒 更新 Session (例如标记 2FA 已验证)
     * @param sessionId Session ID
     * @param updates 要更新的字段
     */
    static updateSession(sessionId: string, updates: Partial<SessionData>): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        Object.assign(session, updates);
        this.sessions.set(sessionId, session);

        return true;
    }

    /**
     * 🔒 销毁 Session (登出)
     * @param sessionId Session ID
     */
    static destroySession(sessionId: string): void {
        this.sessions.delete(sessionId);
        console.log(`🔒 [SessionManager] Session destroyed: ${sessionId}`);
    }

    /**
     * 🔒 销毁用户的所有 Session (修改密码、禁用账号时调用)
     * @param adminId 管理员 ID
     */
    static destroyAllUserSessions(adminId: string): number {
        let count = 0;
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.adminId === adminId) {
                this.sessions.delete(sessionId);
                count++;
            }
        }

        console.log(`🔒 [SessionManager] Destroyed ${count} sessions for admin: ${adminId}`);
        return count;
    }

    /**
     * 🔒 清理过期 Session
     */
    private static cleanExpiredSessions(): void {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.sessions.entries()) {
            // 检查过期时间
            if (session.expiresAt < now) {
                this.sessions.delete(sessionId);
                cleanedCount++;
                continue;
            }

            // 检查空闲超时
            if (now - session.lastAccessAt > this.MAX_IDLE_TIME_MS) {
                this.sessions.delete(sessionId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🔒 [SessionManager] Cleaned ${cleanedCount} expired sessions`);
        }
    }

    /**
     * 🔒 获取 Session 统计信息 (用于监控)
     */
    static getStats(): {
        totalSessions: number;
        activeSessions: number;
        expiredSessions: number;
        sessionsByRole: Record<string, number>;
    } {
        const now = Date.now();
        let activeSessions = 0;
        let expiredSessions = 0;
        const sessionsByRole: Record<string, number> = {};

        for (const session of this.sessions.values()) {
            if (session.expiresAt < now || now - session.lastAccessAt > this.MAX_IDLE_TIME_MS) {
                expiredSessions++;
            } else {
                activeSessions++;
                sessionsByRole[session.role] = (sessionsByRole[session.role] || 0) + 1;
            }
        }

        return {
            totalSessions: this.sessions.size,
            activeSessions,
            expiredSessions,
            sessionsByRole
        };
    }

    /**
     * 🔒 获取用户的活跃 Session 列表
     * @param adminId 管理员 ID
     */
    static getUserSessions(adminId: string): SessionData[] {
        const userSessions: SessionData[] = [];
        const now = Date.now();

        for (const session of this.sessions.values()) {
            if (session.adminId === adminId && session.expiresAt > now) {
                userSessions.push(session);
            }
        }

        return userSessions;
    }
}

/**
 * 🔒 Cookie 配置建议
 *
 * 在 HTTP 响应中设置 Cookie 时使用以下配置:
 *
 * ```typescript
 * const cookieOptions = {
 *   httpOnly: true,        // 防止 XSS 攻击读取 Cookie
 *   secure: true,          // 仅在 HTTPS 下传输
 *   sameSite: 'strict',    // 防止 CSRF 攻击
 *   maxAge: 24 * 60 * 60 * 1000, // 24小时
 *   path: '/',
 *   domain: '.your-domain.com'
 * };
 *
 * res.cookie('sessionId', sessionId, cookieOptions);
 * ```
 */
