import { ApiCall } from "tsrpc";
import { ReqListAdminSessions, ResListAdminSessions } from "../../../../tsrpc/protocols/gate/admin/PtlListAdminSessions";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { MongoDBService } from "../../db/MongoDBService";

export async function ApiListAdminSessions(call: ApiCall<ReqListAdminSessions, ResListAdminSessions>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageAdmins);
    if (!auth.authorized) return;

    const currentToken = call.req.__ssoToken;
    const col = MongoDBService.getCollection('admin_sessions');
    const sessions = await col.find({})
        .project({ _id: 0 })
        .sort({ createdAt: -1 })
        .toArray();

    call.succ({
        sessions: sessions.map(s => ({
            token: s.token,
            adminId: s.adminId,
            username: s.username,
            role: s.role,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            ip: s.ip,
            userAgent: s.userAgent,
            current: currentToken === s.token
        }))
    });
}
