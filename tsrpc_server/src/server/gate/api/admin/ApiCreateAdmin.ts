import { ApiCall } from "tsrpc";
import { ReqCreateAdmin, ResCreateAdmin } from "../../../../tsrpc/protocols/gate/admin/PtlCreateAdmin";
import { AdminUserSystem, AdminPermission, AdminRole } from "../../bll/AdminUserSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";

export async function ApiCreateAdmin(call: ApiCall<ReqCreateAdmin, ResCreateAdmin>) {
    const { username, password, role, email } = call.req;

    // 🔒 权限检查：只有超级管理员可以创建管理员
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ManageAdmins
    );
    if (!auth.authorized) return;

    // 验证输入
    if (!username || username.length < 3) {
        call.succ({
            success: false,
            error: '用户名至少需要3个字符'
        });
        return;
    }

    if (!password || password.length < 6) {
        call.succ({
            success: false,
            error: '密码至少需要6个字符'
        });
        return;
    }

    if (!role || !Object.values(AdminRole).includes(role as AdminRole)) {
        call.succ({
            success: false,
            error: '无效的角色类型'
        });
        return;
    }

    try {
        const result = await AdminUserSystem.createAdmin(
            username,
            password,
            role as AdminRole,
            email
        );

        if (result.success) {
            call.logger.log(`[ApiCreateAdmin] 新管理员已创建: ${username} (${role})`);
        }

        call.succ(result);

    } catch (error: any) {
        call.logger.error('[ApiCreateAdmin] Error:', error);
        call.succ({
            success: false,
            error: '创建管理员失败'
        });
    }
}
