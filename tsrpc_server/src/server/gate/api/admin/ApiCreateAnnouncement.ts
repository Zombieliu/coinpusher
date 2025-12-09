import { ApiCall } from "tsrpc";
import { ReqCreateAnnouncement, ResCreateAnnouncement } from "../../../../tsrpc/protocols/gate/admin/PtlCreateAnnouncement";
import { AnnouncementSystem } from "../../bll/AnnouncementSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiCreateAnnouncement(call: ApiCall<ReqCreateAnnouncement, ResCreateAnnouncement>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.EditConfig);
    if (!auth.authorized) return;

    try {
        const { type, title, content, startTime, endTime, priority, platforms, imageUrl, linkUrl } = call.req;

        const announcementId = await AnnouncementSystem.createAnnouncement({
            type,
            title,
            content,
            startTime,
            endTime,
            priority: priority || 0,
            platforms,
            imageUrl,
            linkUrl,
            active: true,
            createdBy: auth.adminId!
        });

        call.succ({
            success: true,
            announcementId
        });
    } catch (e: any) {
        call.error(e.message);
    }
}
