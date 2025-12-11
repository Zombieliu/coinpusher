import { ApiCall } from "tsrpc";
import { ReqGetInviteRewardHistory, ResGetInviteRewardHistory } from "../../../../tsrpc/protocols/gate/admin/PtlGetInviteRewardHistory";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { InviteConfigSystem } from "../../bll/InviteConfigSystem";

export async function ApiGetInviteRewardHistory(call: ApiCall<ReqGetInviteRewardHistory, ResGetInviteRewardHistory>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewConfig);
    if (!auth.authorized) return;

    try {
        const history = await InviteConfigSystem.getHistory({
            page: call.req.page,
            limit: call.req.limit,
            status: call.req.status
        });

        call.succ(history);
    } catch (error: any) {
        call.error(error.message || 'Failed to load invite config history');
    }
}
