import { ApiCall } from "tsrpc";
import { ReqDeleteAnnouncement, ResDeleteAnnouncement } from "../../../../tsrpc/protocols/gate/admin/PtlDeleteAnnouncement";
import { AnnouncementSystem } from "../../bll/AnnouncementSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiDeleteAnnouncement(call: ApiCall<ReqDeleteAnnouncement, ResDeleteAnnouncement>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.EditConfig);
    if (!auth.authorized) return;

    try {
        const { announcementId } = call.req;

        const success = await AnnouncementSystem.deleteAnnouncement(announcementId);

        if (!success) {
            call.error('删除失败，公告可能不存在');
            return;
        }

        call.succ({ success: true });
    } catch (e: any) {
        call.error(e.message);
    }
}
