import { ApiCall } from "tsrpc";
import { ReqExportInviteLeaderboard, ResExportInviteLeaderboard } from "../../../../tsrpc/protocols/gate/admin/PtlExportInviteLeaderboard";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { InviteAdminSystem } from "../../bll/InviteAdminSystem";

export async function ApiExportInviteLeaderboard(call: ApiCall<ReqExportInviteLeaderboard, ResExportInviteLeaderboard>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewConfig);
    if (!auth.authorized) return;

    try {
        const payload = await InviteAdminSystem.exportLeaderboard({
            limit: call.req.limit,
            sortBy: call.req.sortBy,
            search: call.req.search
        });
        call.succ(payload);
    } catch (error: any) {
        call.error(error.message || 'Failed to export leaderboard');
    }
}
