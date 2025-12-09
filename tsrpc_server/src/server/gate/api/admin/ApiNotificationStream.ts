import { ApiCall } from "tsrpc";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { NotificationSystem, Notification } from "../../bll/NotificationSystem";

export interface ReqNotificationStream {
    __ssoToken?: string;
}

export interface ResNotificationStream {
    // SSE流式响应，不需要返回类型
}

/**
 * 实时通知流 (Server-Sent Events)
 *
 * 注意: 这个API需要特殊处理，因为它是长连接
 * 在TSRPC中实现SSE需要访问底层的HTTP response对象
 *
 * 建议: 创建一个独立的HTTP endpoint来处理SSE
 * 例如: GET /admin/notifications/stream
 */
export async function ApiNotificationStream(
    call: ApiCall<ReqNotificationStream, ResNotificationStream>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ViewStatistics // 任何有权限的管理员都可以接收通知
    );
    if (!auth.authorized) return;

    // 注意: 以下代码是示例，实际需要根据TSRPC的实现来调整
    // TSRPC可能不支持SSE，建议使用独立的HTTP endpoint

    const listenerId = `admin_${auth.adminId}_${Date.now()}`;

    try {
        // 这里需要访问底层HTTP response对象
        // const res = call.conn.httpRes; // 假设的API

        // 设置SSE headers
        // res.writeHead(200, {
        //     'Content-Type': 'text/event-stream',
        //     'Cache-Control': 'no-cache',
        //     'Connection': 'keep-alive',
        // });

        // 发送初始消息
        // res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

        // 添加监听器
        NotificationSystem.addListener(listenerId, (notification: Notification) => {
            // res.write(`data: ${JSON.stringify(notification)}\n\n`);
        });

        // 心跳保持连接
        const heartbeatInterval = setInterval(() => {
            // res.write(`: heartbeat\n\n`);
        }, 30000);

        // 连接关闭时清理
        // call.conn.on('close', () => {
        //     clearInterval(heartbeatInterval);
        //     NotificationSystem.removeListener(listenerId);
        // });

    } catch (error) {
        console.error('[ApiNotificationStream] Error:', error);
        NotificationSystem.removeListener(listenerId);
        call.error('Internal server error');
    }
}
