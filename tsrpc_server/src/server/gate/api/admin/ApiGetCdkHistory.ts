import { ApiCall } from "tsrpc";
import { ReqGetCdkHistory, ResGetCdkHistory } from "../../../../tsrpc/protocols/gate/admin/PtlGetCdkHistory";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { CdkSystem } from "../../bll/CdkSystem";
import { CdkAdminSystem } from "../../bll/CdkAdminSystem";

export async function ApiGetCdkHistory(call: ApiCall<ReqGetCdkHistory, ResGetCdkHistory>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewConfig);
    if (!auth.authorized) return;

    const page = call.req.page ?? 1;
    const limit = call.req.limit ?? 20;
    const filters = {
        batchId: call.req.batchId,
        code: call.req.code,
        page,
        limit
    };

    try {
        const type = call.req.type || 'all';

        const usage = type === 'actions'
            ? { list: [], total: 0, page, pageSize: limit }
            : await CdkSystem.getUsageLogs(filters);

        const actions = type === 'usage'
            ? { list: [], total: 0, page, pageSize: limit }
            : await CdkAdminSystem.getActionLogs(filters);

        call.succ({
            usage,
            actions
        });
    } catch (error: any) {
        call.error(error.message || 'Failed to load CDK history');
    }
}
