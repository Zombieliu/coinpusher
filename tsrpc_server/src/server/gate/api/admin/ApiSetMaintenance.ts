import { ApiCall } from "tsrpc";
import { ReqSetMaintenance, ResSetMaintenance } from "../../../../tsrpc/protocols/gate/admin/PtlSetMaintenance";
import { SystemConfigSystem } from "../../bll/SystemConfigSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'admin/SetMaintenance';

export async function ApiSetMaintenance(call: ApiCall<ReqSetMaintenance, ResSetMaintenance>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.SystemConfig);
    if (!auth.authorized) return;

    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        const { enabled, reason, whitelistIps, whitelistUsers } = call.req;
        await SystemConfigSystem.setMaintenanceConfig({
            enabled,
            reason: reason || '维护中',
            whitelistIps: whitelistIps || [],
            whitelistUsers: whitelistUsers || []
        }, auth.username!);

        call.succ({ success: true });
        success = true;
    } catch (e: any) {
        recordApiError('POST', ENDPOINT, e?.message || 'maintenance_error');
        call.error(e?.message || 'Failed to update maintenance config');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
