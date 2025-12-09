import { ApiCall } from "tsrpc";
import { ReqGetSystemConfig, ResGetSystemConfig } from "../../../../tsrpc/protocols/gate/admin/PtlGetSystemConfig";
import { SystemConfigSystem } from "../../bll/SystemConfigSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'admin/GetSystemConfig';

export async function ApiGetSystemConfig(call: ApiCall<ReqGetSystemConfig, ResGetSystemConfig>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewConfig);
    if (!auth.authorized) return;

    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        const value = await SystemConfigSystem.getConfig(call.req.key, null);
        call.succ({ success: true, value });
        success = true;
    } catch (e: any) {
        recordApiError('POST', ENDPOINT, e?.message || 'system_config_error');
        call.error(e?.message || 'Failed to load config');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
