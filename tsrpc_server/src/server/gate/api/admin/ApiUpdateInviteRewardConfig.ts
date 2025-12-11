import { ApiCall } from "tsrpc";
import { ReqUpdateInviteRewardConfig, ResUpdateInviteRewardConfig } from "../../../../tsrpc/protocols/gate/admin/PtlUpdateInviteRewardConfig";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { InviteConfigSystem } from "../../bll/InviteConfigSystem";

export async function ApiUpdateInviteRewardConfig(call: ApiCall<ReqUpdateInviteRewardConfig, ResUpdateInviteRewardConfig>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.EditConfig);
    if (!auth.authorized) return;

    try {
        const record = await InviteConfigSystem.updateConfig({
            adminId: auth.adminId!,
            adminName: auth.username || 'unknown',
            config: call.req.config,
            comment: call.req.comment,
            reviewerId: call.req.reviewerId || auth.adminId,
            reviewerName: call.req.reviewerName || auth.username,
            reviewStatus: call.req.reviewStatus
        });

        call.succ({
            success: true,
            version: record.version,
            status: record.reviewStatus,
            updatedAt: record.updatedAt
        });
    } catch (error: any) {
        call.error(error.message || 'Failed to update invite config');
    }
}
