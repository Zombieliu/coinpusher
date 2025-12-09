import { ApiCall } from "tsrpc";
import { ReqGetAdvancedStats, ResGetAdvancedStats } from "../../../../tsrpc/protocols/gate/admin/PtlGetAdvancedStats";
import { AnalysisSystem } from "../../bll/AnalysisSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'admin/GetAdvancedStats';

export async function ApiGetAdvancedStats(call: ApiCall<ReqGetAdvancedStats, ResGetAdvancedStats>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewStatistics);
    if (!auth.authorized) return;

    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        let data;
        const days = call.req.days || 30;

        if (call.req.type === 'ltv') {
            data = await AnalysisSystem.getLTVStats(days);
        } else if (call.req.type === 'retention') {
            data = await AnalysisSystem.getRetentionStats(days);
        }

        call.succ({ success: true, data });
        success = true;
    } catch (e: any) {
        recordApiError('POST', ENDPOINT, e?.message || 'unknown_error');
        call.error(e?.message || 'Internal server error');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
