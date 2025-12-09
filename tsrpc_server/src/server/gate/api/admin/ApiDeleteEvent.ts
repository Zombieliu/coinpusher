import { ReqDeleteEvent, ResDeleteEvent } from "../../../../tsrpc/protocols/gate/admin/PtlDeleteEvent";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminUserSystem } from "../../bll/AdminUserSystem";



export async function ApiDeleteEvent(
    call: ApiCall<ReqDeleteEvent, ResDeleteEvent>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.EditEvents
    );
    if (!auth.authorized) return;

    try {
        const { eventId } = call.req;

        if (!eventId) {
            call.error('eventId is required');
            return;
        }

        const eventsCollection = MongoDBService.getCollection('events');
        const { ObjectId } = require('mongodb');

        // 软删除：只标记为disabled
        const result = await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) },
            {
                $set: {
                    enabled: false,
                    deletedAt: Date.now(),
                    deletedBy: auth.username,
                }
            }
        );

        if (result.matchedCount === 0) {
            call.succ({
                success: false,
                message: '活动不存在',
            });
            return;
        }

        // 记录操作日志
        await AdminUserSystem.logAdminAction(auth.adminId!, 'delete_event', {
            eventId,
            timestamp: Date.now(),
        });

        call.succ({
            success: true,
            message: '活动已删除',
        });

    } catch (error) {
        console.error('[ApiDeleteEvent] Error:', error);
        call.error('Internal server error');
    }
}
