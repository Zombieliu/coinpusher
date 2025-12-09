import { ApiCall } from "tsrpc";
import { ReqUpdateAdminStatus, ResUpdateAdminStatus } from "../../../../tsrpc/protocols/gate/admin/PtlUpdateAdminStatus";
import { AdminUserSystem, AdminPermission } from "../../bll/AdminUserSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";

export async function ApiUpdateAdminStatus(call: ApiCall<ReqUpdateAdminStatus, ResUpdateAdminStatus>) {
    const { adminId, status } = call.req;

    // 🔒 权限检查：只有超级管理员可以修改管理员状态
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ManageAdmins
    );
    if (!auth.authorized) return;

    // 防止禁用自己
    if (auth.adminId === adminId) {
        call.succ({
            success: false,
            error: '不能修改自己的状态'
        });
        return;
    }

    try {
        const result = await AdminUserSystem.updateAdminStatus(adminId, status);

        if (result.success) {
            call.logger.log(`[ApiUpdateAdminStatus] 管理员状态已更新: ${adminId} -> ${status}`);
        }

        call.succ(result);

    } catch (error: any) {
        call.logger.error('[ApiUpdateAdminStatus] Error:', error);
        call.succ({
            success: false,
            error: '更新管理员状态失败'
        });
    }
}
