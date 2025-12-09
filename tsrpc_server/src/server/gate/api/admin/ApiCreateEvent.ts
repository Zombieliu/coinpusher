import { ReqCreateEvent, ResCreateEvent } from "../../../../tsrpc/protocols/gate/admin/PtlCreateEvent";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminUserSystem } from "../../bll/AdminUserSystem";



export async function ApiCreateEvent(
    call: ApiCall<ReqCreateEvent, ResCreateEvent>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.EditEvents
    );
    if (!auth.authorized) return;

    try {
        const { eventType, title, description, startTime, endTime, config, rewards } = call.req;

        // 验证必填字段
        if (!eventType || !title || !startTime || !endTime) {
            call.succ({
                success: false,
                message: '活动类型、标题、开始时间和结束时间不能为空',
            });
            return;
        }

        // 验证时间
        if (startTime >= endTime) {
            call.succ({
                success: false,
                message: '开始时间必须早于结束时间',
            });
            return;
        }

        if (endTime < Date.now()) {
            call.succ({
                success: false,
                message: '结束时间不能早于当前时间',
            });
            return;
        }

        const eventsCollection = MongoDBService.getCollection('events');

        // 创建活动
        const newEvent = {
            eventType,
            title,
            description: description || '',
            startTime,
            endTime,
            config: config || {},
            rewards: rewards || {},
            createdAt: Date.now(),
            createdBy: auth.username,
            enabled: true,
        };

        const result = await eventsCollection.insertOne(newEvent);

        // 记录操作日志
        await AdminUserSystem.logAdminAction(auth.adminId!, 'create_event', {
            eventId: result.insertedId.toString(),
            eventType,
            title,
            startTime,
            endTime,
            timestamp: Date.now(),
        });

        call.succ({
            success: true,
            eventId: result.insertedId.toString(),
            message: '活动创建成功',
        });

    } catch (error) {
        console.error('[ApiCreateEvent] Error:', error);
        call.error('Internal server error');
    }
}
