import { ApiCall } from "tsrpc";
import { ReqUpdateAnnouncement, ResUpdateAnnouncement } from "../../../../tsrpc/protocols/gate/admin/PtlUpdateAnnouncement";
import { AnnouncementSystem } from "../../bll/AnnouncementSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiUpdateAnnouncement(call: ApiCall<ReqUpdateAnnouncement, ResUpdateAnnouncement>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.EditConfig);
    if (!auth.authorized) return;

    try {
        const { announcementId, updates } = call.req;

        const success = await AnnouncementSystem.updateAnnouncement(
            announcementId,
            updates,
            auth.adminId!
        );

        if (!success) {
            call.error('更新失败，公告可能不存在');
            return;
        }

        call.succ({ success: true });
    } catch (e: any) {
        call.error(e.message);
    }
}
