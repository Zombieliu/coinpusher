import { ApiCall } from "tsrpc";
import { AdminUserSystem, AdminPermission, AdminRole } from "../bll/AdminUserSystem";
import { AuditLogMiddleware } from "./AuditLogMiddleware";

/**
 * 管理员认证中间件
 * 用于验证管理员token和权限
 */
export class AdminAuthMiddleware {
    /**
     * 验证管理员token
     */
    static async verifyToken(token?: string): Promise<{
        valid: boolean;
        adminId?: string;
        username?: string;
        role?: AdminRole;
        message?: string;
    }> {
        if (!token) {
            return { valid: false, message: 'Token is required' };
        }

        const session = await AdminUserSystem.validateToken(token);

        if (!session) {
            return { valid: false, message: 'Invalid or expired token' };
        }

        return {
            valid: true,
            adminId: session.adminId,
            username: session.username,
            role: session.role
        };
    }

    /**
     * 检查权限
     */
    static checkPermission(role: AdminRole, permission: AdminPermission): boolean {
        return AdminUserSystem.hasPermission(role, permission);
    }

    /**
     * 通用管理员API拦截器
     * 验证token并检查权限，并在API调用结束后记录审计日志
     */
    static async requirePermission<Req extends { __ssoToken?: string }, Res>(
        call: ApiCall<Req, Res>,
        permission: AdminPermission
    ): Promise<{
        authorized: boolean;
        adminId?: string;
        username?: string;
        role?: AdminRole;
    }> {
        const token = call.req.__ssoToken;

        const verification = await this.verifyToken(token);

        if (!verification.valid) {
            call.error(verification.message || 'Unauthorized');
            return { authorized: false };
        }

        // 检查权限
        if (!this.checkPermission(verification.role!, permission)) {
            call.error(`Permission denied: ${permission} required`);
            return { authorized: false };
        }

        // 在API调用结束后记录审计日志
        const originalSucc = call.succ.bind(call);
        const originalError = call.error.bind(call);

        call.succ = ((res: any) => {
            // 记录审计日志
            AuditLogMiddleware.logApiCall(call, verification.adminId!, verification.username!).catch(err => {
                console.error('[AdminAuthMiddleware] 审计日志记录失败:', err);
            });
            return originalSucc(res);
        }) as any;

        call.error = ((message: string, data?: any) => {
            // 即使出错也记录审计日志
            AuditLogMiddleware.logApiCall(call, verification.adminId!, verification.username!).catch(err => {
                console.error('[AdminAuthMiddleware] 审计日志记录失败:', err);
            });
            return originalError(message, data);
        }) as any;

        return {
            authorized: true,
            adminId: verification.adminId,
            username: verification.username,
            role: verification.role
        };
    }

    /**
     * 要求超级管理员权限
     */
    static async requireSuperAdmin<Req extends { __ssoToken?: string }, Res>(
        call: ApiCall<Req, Res>
    ): Promise<{
        authorized: boolean;
        adminId?: string;
        username?: string;
    }> {
        const token = call.req.__ssoToken;

        const verification = await this.verifyToken(token);

        if (!verification.valid) {
            call.error(verification.message || 'Unauthorized');
            return { authorized: false };
        }

        if (verification.role !== AdminRole.SuperAdmin) {
            call.error('Super admin permission required');
            return { authorized: false };
        }

        return {
            authorized: true,
            adminId: verification.adminId,
            username: verification.username
        };
    }
}
