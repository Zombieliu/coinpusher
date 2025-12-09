import { ApiCall } from "tsrpc";
import { ReqGetAnnouncements, ResGetAnnouncements } from "../../../../tsrpc/protocols/gate/admin/PtlGetAnnouncements";
import { AnnouncementSystem } from "../../bll/AnnouncementSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetAnnouncements(call: ApiCall<ReqGetAnnouncements, ResGetAnnouncements>) {
    // 允许客户端或管理员调用。如果是管理员，需要权限；如果是客户端，通常不需要ssoToken或者有别的验证
    // 这里假设这个API是给后台用的，客户端可能有另一个API（如 ApiGetActiveAnnouncements）
    // 为了简化，这里统一处理
    
    let isAdmin = false;
    if (call.req.__ssoToken) {
        const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewConfig);
        if (auth.authorized) isAdmin = true;
    }

    try {
        const { type, activeOnly, page, limit } = call.req;
        
        const result = await AnnouncementSystem.getAnnouncements({
            type,
            active: activeOnly ? true : undefined,
            now: activeOnly ? Date.now() : undefined,
            page,
            limit
        });

        call.succ({
            success: true,
            list: result.list,
            total: result.total
        });
    } catch (e: any) {
        call.error(e.message);
    }
}
