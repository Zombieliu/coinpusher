import { ApiCall } from "tsrpc";
import { ReqGetInviteLeaderboard, ResGetInviteLeaderboard } from "../../../../tsrpc/protocols/gate/admin/PtlGetInviteLeaderboard";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { InviteAdminSystem } from "../../bll/InviteAdminSystem";

export async function ApiGetInviteLeaderboard(call: ApiCall<ReqGetInviteLeaderboard, ResGetInviteLeaderboard>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewConfig);
    if (!auth.authorized) return;

    try {
        const result = await InviteAdminSystem.getLeaderboard({
            page: call.req.page,
            limit: call.req.limit,
            sortBy: call.req.sortBy,
            search: call.req.search
        });
        call.succ(result);
    } catch (error: any) {
        call.error(error.message || 'Failed to load leaderboard');
    }
}
