import { ApiCall } from "tsrpc";
import { ReqUpdateAdminPermissions, ResUpdateAdminPermissions } from "../../../../tsrpc/protocols/gate/admin/PtlUpdateAdminPermissions";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminUserSystem, AdminRole } from "../../bll/AdminUserSystem";
import { MongoDBService } from "../../db/MongoDBService";

export async function ApiUpdateAdminPermissions(call: ApiCall<ReqUpdateAdminPermissions, ResUpdateAdminPermissions>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageAdmins);
    if (!auth.authorized) return;

    const { adminId, permissions } = call.req;
    if (!adminId || !Array.isArray(permissions)) {
        call.succ({ success: false, message: 'invalid_params' });
        return;
    }

    // 不允许修改超级管理员
    const admins = MongoDBService.getCollection('admin_users');
    const target = await admins.findOne({ adminId });
    if (!target) {
        call.succ({ success: false, message: 'not_found' });
        return;
    }
    if (target.role === AdminRole.SuperAdmin) {
        call.succ({ success: false, message: 'cannot_edit_super_admin' });
        return;
    }

    await admins.updateOne(
        { adminId },
        { $set: { permissions } }
    );

    // 踢出该管理员所有会话，要求重新登录
    await AdminUserSystem.kickAllSessions(adminId);

    call.succ({ success: true });
}
