import { ApiCall } from "tsrpc";
import { ReqGetActiveAlerts, ResGetActiveAlerts } from "../../../../tsrpc/protocols/gate/admin/PtlGetActiveAlerts";
import { MonitoringSystem } from "../../bll/MonitoringSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetActiveAlerts(call: ApiCall<ReqGetActiveAlerts, ResGetActiveAlerts>) {
    // 权限检查 - 所有管理员都可以查看告警
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewUsers);
    if (!auth.authorized) return;

    try {
        const alerts = MonitoringSystem.getActiveAlerts();

        call.succ({
            success: true,
            alerts,
        });
    } catch (error: any) {
        call.logger.error('[ApiGetActiveAlerts] Error:', error);
        call.succ({
            success: false,
            error: '获取告警信息失败',
        });
    }
}
