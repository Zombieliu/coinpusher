import { ApiCall } from "tsrpc";
import { ReqKickAdminSession, ResKickAdminSession } from "../../../../tsrpc/protocols/gate/admin/PtlKickAdminSession";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { MongoDBService } from "../../db/MongoDBService";

export async function ApiKickAdminSession(call: ApiCall<ReqKickAdminSession, ResKickAdminSession>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageAdmins);
    if (!auth.authorized) return;

    const { token, kickAllOfAdmin } = call.req;
    if (!token) {
        call.succ({ success: false, message: 'token_required' });
        return;
    }

    const col = MongoDBService.getCollection('admin_sessions');
    const target = await col.findOne({ token });
    if (!target) {
        call.succ({ success: false, message: 'not_found' });
        return;
    }

    // 不允许自踢当前会话
    if (call.req.__ssoToken === token && !kickAllOfAdmin) {
        call.succ({ success: false, message: 'cannot_kick_self' });
        return;
    }

    let result;
    if (kickAllOfAdmin) {
        result = await col.deleteMany({ adminId: target.adminId });
    } else {
        result = await col.deleteOne({ token });
    }

    call.succ({ success: true, kicked: result.deletedCount || 0 });
}
