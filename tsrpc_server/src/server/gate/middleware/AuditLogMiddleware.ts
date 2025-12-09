/**
 * 审计日志中间件
 * 自动记录所有管理员的敏感操作
 */

import { ApiCall } from "tsrpc";
import { AuditLogSystem, AuditCategory } from "../bll/AuditLogSystem";

// 需要记录审计日志的API配置
const AUDIT_CONFIG: Record<string, {
    category: AuditCategory;
    actionName: string;
    getTargetInfo?: (call: ApiCall<any, any>) => { targetType?: string; targetId?: string; targetName?: string };
}> = {
    'admin/CreateAdmin': {
        category: AuditCategory.AdminManagement,
        actionName: '创建管理员',
        getTargetInfo: (call) => ({
            targetType: 'admin',
            targetId: call.req.username,
            targetName: call.req.username,
        }),
    },
    'admin/UpdateAdminStatus': {
        category: AuditCategory.AdminManagement,
        actionName: '修改管理员状态',
        getTargetInfo: (call) => ({
            targetType: 'admin',
            targetId: call.req.adminId,
        }),
    },
    'admin/BanUser': {
        category: AuditCategory.UserManagement,
        actionName: '封禁用户',
        getTargetInfo: (call) => ({
            targetType: 'user',
            targetId: call.req.userId,
        }),
    },
    'admin/UnbanUser': {
        category: AuditCategory.UserManagement,
        actionName: '解封用户',
        getTargetInfo: (call) => ({
            targetType: 'user',
            targetId: call.req.userId,
        }),
    },
    'admin/BatchBanUsers': {
        category: AuditCategory.UserManagement,
        actionName: '批量封禁用户',
        getTargetInfo: (call) => ({
            targetType: 'user',
            targetName: `${call.req.userIds?.length || 0}个用户`,
        }),
    },
    'admin/GrantReward': {
        category: AuditCategory.GameData,
        actionName: '发放奖励',
        getTargetInfo: (call) => ({
            targetType: 'user',
            targetId: call.req.userId,
        }),
    },
    'admin/UpdateConfig': {
        category: AuditCategory.SystemConfig,
        actionName: '更新配置',
        getTargetInfo: (call) => ({
            targetType: 'config',
            targetId: call.req.configType,
            targetName: call.req.configType,
        }),
    },
    'admin/RollbackConfig': {
        category: AuditCategory.SystemConfig,
        actionName: '回滚配置',
        getTargetInfo: (call) => ({
            targetType: 'config',
            targetId: call.req.configType,
            targetName: call.req.configType,
        }),
    },
    'admin/SendMail': {
        category: AuditCategory.GameData,
        actionName: '发送邮件',
        getTargetInfo: (call) => ({
            targetType: 'mail',
            targetName: call.req.type,
        }),
    },
    'admin/BatchSendMail': {
        category: AuditCategory.GameData,
        actionName: '批量发送邮件',
    },
    'admin/CreateEvent': {
        category: AuditCategory.GameData,
        actionName: '创建活动',
    },
    'admin/UpdateEvent': {
        category: AuditCategory.GameData,
        actionName: '更新活动',
        getTargetInfo: (call) => ({
            targetType: 'event',
            targetId: call.req.eventId,
        }),
    },
    'admin/DeleteEvent': {
        category: AuditCategory.GameData,
        actionName: '删除活动',
        getTargetInfo: (call) => ({
            targetType: 'event',
            targetId: call.req.eventId,
        }),
    },
};

export class AuditLogMiddleware {
    /**
     * 记录API调用的审计日志
     */
    static async logApiCall(call: ApiCall<any, any>, adminId: string, adminUsername: string) {
        const apiPath = call.service.name;
        const config = AUDIT_CONFIG[apiPath];

        // 只记录配置中的敏感操作
        if (!config) return;

        try {
            // 获取客户端IP
            const ipAddress = this.getClientIp(call);
            const userAgent = call.req.__headers?.['user-agent'];

            const response: any = (call as any).res || {};
            // 判断操作结果
            const result = response?.success !== false ? 'success' : 'failed';
            const errorMessage = response?.error;

            // 获取目标信息
            let targetInfo = {};
            if (config.getTargetInfo) {
                targetInfo = config.getTargetInfo(call);
            }

            // 记录审计日志
            await AuditLogSystem.log({
                adminId,
                adminUsername,
                action: apiPath,
                category: config.category,
                ...targetInfo,
                details: {
                    request: this.sanitizeRequest(call.req),
                    response: this.sanitizeResponse(response),
                },
                ipAddress,
                userAgent,
                result,
                errorMessage,
            });
        } catch (error) {
            console.error('[AuditLogMiddleware] 记录审计日志失败:', error);
        }
    }

    /**
     * 获取客户端IP地址
     */
    private static getClientIp(call: ApiCall<any, any>): string {
        const headers = call.req.__headers || {};
        return headers['x-forwarded-for']?.split(',')[0]?.trim()
            || headers['x-real-ip']
            || call.conn.ip
            || 'unknown';
    }

    /**
     * 清理请求数据（移除敏感信息）
     */
    private static sanitizeRequest(req: any): any {
        const sanitized = { ...req };
        delete sanitized.__ssoToken;
        delete sanitized.password;
        delete sanitized.__headers;
        return sanitized;
    }

    /**
     * 清理响应数据（移除敏感信息）
     */
    private static sanitizeResponse(res: any): any {
        if (!res) {
            return {};
        }
        const sanitized = { ...res };
        delete sanitized.token;
        delete sanitized.passwordHash;
        return sanitized;
    }
}
