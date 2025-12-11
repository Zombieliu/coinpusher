import { ApiCall } from "tsrpc";
import { ReqGetInviteRewardConfig, ResGetInviteRewardConfig } from "../../../../tsrpc/protocols/gate/admin/PtlGetInviteRewardConfig";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { InviteConfigSystem } from "../../bll/InviteConfigSystem";

export async function ApiGetInviteRewardConfig(call: ApiCall<ReqGetInviteRewardConfig, ResGetInviteRewardConfig>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewConfig);
    if (!auth.authorized) return;

    try {
        const record = await InviteConfigSystem.getActiveConfig();
        call.succ({
            version: record.version,
            config: record.config,
            updatedAt: record.updatedAt,
            updatedBy: record.updatedBy,
            reviewer: record.reviewer,
            reviewStatus: record.reviewStatus,
            comment: record.comment
        });
    } catch (error: any) {
        call.error(error.message || 'Failed to load invite config');
    }
}
