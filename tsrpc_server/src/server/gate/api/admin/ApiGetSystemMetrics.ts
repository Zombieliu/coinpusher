import { ApiCall } from "tsrpc";
import { ReqGetSystemMetrics, ResGetSystemMetrics } from "../../../../tsrpc/protocols/gate/admin/PtlGetSystemMetrics";
import { MonitoringSystem } from "../../bll/MonitoringSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetSystemMetrics(call: ApiCall<ReqGetSystemMetrics, ResGetSystemMetrics>) {
    // 权限检查 - 所有管理员都可以查看监控
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewUsers);
    if (!auth.authorized) return;

    try {
        const server = MonitoringSystem.getServerMetrics();
        const business = await MonitoringSystem.getBusinessMetrics();

        call.succ({
            success: true,
            server,
            business,
        });
    } catch (error: any) {
        call.logger.error('[ApiGetSystemMetrics] Error:', error);
        call.succ({
            success: false,
            error: '获取系统指标失败',
        });
    }
}
