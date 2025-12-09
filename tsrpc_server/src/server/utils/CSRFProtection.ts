import * as crypto from 'crypto';

/**
 * 🔒 CSRF (Cross-Site Request Forgery) Protection
 *
 * 防止跨站请求伪造攻击，保护 Admin API
 *
 * 使用方式:
 * 1. 客户端请求 CSRF Token (GET /api/csrf-token)
 * 2. 在表单提交时携带 Token (Header: X-CSRF-Token)
 * 3. 服务器验证 Token 是否匹配
 *
 * 安全机制:
 * - Double Submit Cookie 模式
 * - Token 与 Session 绑定
 * - 定期过期刷新
 */

export interface CSRFToken {
    token: string;
    sessionId: string;
    createdAt: number;
    expiresAt: number;
}

export class CSRFProtection {
    private static readonly TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1小时
    private static readonly tokenStore = new Map<string, CSRFToken>();

    /**
     * 🔒 生成 CSRF Token
     * @param sessionId 管理员的 Session ID
     * @returns CSRF Token
     */
    static generateToken(sessionId: string): string {
        // 生成随机 Token
        const token = crypto.randomBytes(32).toString('hex');

        // 存储 Token 与 Session 的映射
        const csrfToken: CSRFToken = {
            token,
            sessionId,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.TOKEN_LIFETIME_MS
        };

        this.tokenStore.set(token, csrfToken);

        // 清理过期 Token (每次生成时清理)
        this.cleanExpiredTokens();

        return token;
    }

    /**
     * 🔒 验证 CSRF Token
     * @param token 客户端提交的 Token
     * @param sessionId 当前 Session ID
     * @returns 验证结果
     */
    static verifyToken(token: string, sessionId: string): {
        valid: boolean;
        error?: string;
    } {
        if (!token) {
            return { valid: false, error: 'CSRF token is missing' };
        }

        const storedToken = this.tokenStore.get(token);

        // Token 不存在
        if (!storedToken) {
            return { valid: false, error: 'Invalid CSRF token' };
        }

        // Token 已过期
        if (storedToken.expiresAt < Date.now()) {
            this.tokenStore.delete(token);
            return { valid: false, error: 'CSRF token expired' };
        }

        // Session ID 不匹配
        if (storedToken.sessionId !== sessionId) {
            return { valid: false, error: 'CSRF token does not match session' };
        }

        return { valid: true };
    }

    /**
     * 🔒 刷新 Token (延长有效期)
     * @param token 现有 Token
     * @returns 是否成功刷新
     */
    static refreshToken(token: string): boolean {
        const storedToken = this.tokenStore.get(token);
        if (!storedToken) return false;

        storedToken.expiresAt = Date.now() + this.TOKEN_LIFETIME_MS;
        this.tokenStore.set(token, storedToken);

        return true;
    }

    /**
     * 🔒 删除 Token (登出时调用)
     * @param token Token
     */
    static deleteToken(token: string): void {
        this.tokenStore.delete(token);
    }

    /**
     * 🔒 删除 Session 的所有 Token
     * @param sessionId Session ID
     */
    static deleteSessionTokens(sessionId: string): void {
        for (const [token, data] of this.tokenStore.entries()) {
            if (data.sessionId === sessionId) {
                this.tokenStore.delete(token);
            }
        }
    }

    /**
     * 🔒 清理过期 Token
     */
    private static cleanExpiredTokens(): void {
        const now = Date.now();
        for (const [token, data] of this.tokenStore.entries()) {
            if (data.expiresAt < now) {
                this.tokenStore.delete(token);
            }
        }
    }

    /**
     * 🔒 获取统计信息 (用于监控)
     */
    static getStats(): {
        totalTokens: number;
        expiredTokens: number;
    } {
        const now = Date.now();
        let expiredCount = 0;

        for (const data of this.tokenStore.values()) {
            if (data.expiresAt < now) {
                expiredCount++;
            }
        }

        return {
            totalTokens: this.tokenStore.size,
            expiredTokens: expiredCount
        };
    }
}
