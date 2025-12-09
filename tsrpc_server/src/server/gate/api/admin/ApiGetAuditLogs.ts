import { ApiCall } from "tsrpc";
import { ReqGetAuditLogs, ResGetAuditLogs } from "../../../../tsrpc/protocols/gate/admin/PtlGetAuditLogs";
import { AuditLogSystem, AuditCategory } from "../../bll/AuditLogSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetAuditLogs(call: ApiCall<ReqGetAuditLogs, ResGetAuditLogs>) {
    const { adminId, action, category, targetId, startTime, endTime, result, page, limit } = call.req;

    // 权限检查：只有超级管理员可以查看审计日志
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageAdmins);
    if (!auth.authorized) return;

    try {
        const queryResult = await AuditLogSystem.query({
            adminId,
            action,
            category: category as AuditCategory,
            targetId,
            startTime,
            endTime,
            result,
            page,
            limit,
        });

        call.succ({
            success: true,
            logs: queryResult.logs,
            total: queryResult.total,
            page: queryResult.page,
            pageSize: queryResult.pageSize,
        });
    } catch (error: any) {
        call.logger.error('[ApiGetAuditLogs] Error:', error);
        call.succ({
            success: false,
            error: '获取审计日志失败',
        });
    }
}
