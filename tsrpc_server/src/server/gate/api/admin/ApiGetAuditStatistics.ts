import { ApiCall } from "tsrpc";
import { ReqGetAuditStatistics, ResGetAuditStatistics } from "../../../../tsrpc/protocols/gate/admin/PtlGetAuditStatistics";
import { AuditLogSystem } from "../../bll/AuditLogSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetAuditStatistics(call: ApiCall<ReqGetAuditStatistics, ResGetAuditStatistics>) {
    const { startTime, endTime } = call.req;

    // 权限检查：只有超级管理员可以查看审计统计
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageAdmins);
    if (!auth.authorized) return;

    try {
        const statistics = await AuditLogSystem.getStatistics({
            startTime,
            endTime,
        });

        call.succ({
            success: true,
            data: statistics,
        });
    } catch (error: any) {
        call.logger.error('[ApiGetAuditStatistics] Error:', error);
        call.succ({
            success: false,
            error: '获取审计统计失败',
        });
    }
}
