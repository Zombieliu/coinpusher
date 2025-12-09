import { ReqGetNotifications, ResGetNotifications } from "../../../../tsrpc/protocols/gate/admin/PtlGetNotifications";

import { ApiCall } from "tsrpc";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { NotificationSystem, Notification } from "../../bll/NotificationSystem";



/**
 * 获取通知列表
 * 客户端可以轮询此接口获取最新通知
 */
export async function ApiGetNotifications(
    call: ApiCall<ReqGetNotifications, ResGetNotifications>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ViewStatistics
    );
    if (!auth.authorized) return;

    try {
        const { since, limit = 50 } = call.req;

        // 获取最近的通知
        let notifications = NotificationSystem.getRecentNotifications(100);

        // 如果指定了since，只返回之后的通知
        if (since) {
            notifications = notifications.filter(n => n.timestamp > since);
        }

        // 限制返回数量
        const hasMore = notifications.length > limit;
        notifications = notifications.slice(0, limit);

        call.succ({
            notifications,
            hasMore,
            listenerCount: NotificationSystem.getListenerCount(),
        });

    } catch (error) {
        console.error('[ApiGetNotifications] Error:', error);
        call.error('Internal server error');
    }
}
