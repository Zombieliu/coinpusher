import { ApiCall } from "tsrpc";
import { ReqGetAdmins, ResGetAdmins } from "../../../../tsrpc/protocols/gate/admin/PtlGetAdmins";
import { AdminUserSystem, AdminPermission } from "../../bll/AdminUserSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";

export async function ApiGetAdmins(call: ApiCall<ReqGetAdmins, ResGetAdmins>) {
    // 🔒 权限检查：只有超级管理员可以查看所有管理员
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ManageAdmins
    );
    if (!auth.authorized) return;

    try {
        const admins = await AdminUserSystem.listAdmins();

        // 不返回密码哈希等敏感信息
        const safeAdmins = admins.map(admin => ({
            adminId: admin.adminId,
            username: admin.username,
            role: admin.role,
            email: admin.email,
            status: admin.status,
            createdAt: admin.createdAt,
            lastLoginAt: admin.lastLoginAt
        }));

        call.succ({
            success: true,
            admins: safeAdmins
        });

    } catch (error: any) {
        call.logger.error('[ApiGetAdmins] Error:', error);
        call.succ({
            success: false,
            error: '获取管理员列表失败'
        });
    }
}
