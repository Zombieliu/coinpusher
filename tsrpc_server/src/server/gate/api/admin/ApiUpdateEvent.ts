import { ReqUpdateEvent, ResUpdateEvent } from "../../../../tsrpc/protocols/gate/admin/PtlUpdateEvent";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminUserSystem } from "../../bll/AdminUserSystem";



export async function ApiUpdateEvent(
    call: ApiCall<ReqUpdateEvent, ResUpdateEvent>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.EditEvents
    );
    if (!auth.authorized) return;

    try {
        const { eventId, ...updates } = call.req;

        if (!eventId) {
            call.error('eventId is required');
            return;
        }

        // 验证时间
        if (updates.startTime && updates.endTime && updates.startTime >= updates.endTime) {
            call.succ({
                success: false,
                message: '开始时间必须早于结束时间',
            });
            return;
        }

        const eventsCollection = MongoDBService.getCollection('events');
        const { ObjectId } = require('mongodb');

        // 构建更新字段
        const updateFields: any = {
            updatedAt: Date.now(),
            updatedBy: auth.username,
        };

        if (updates.title !== undefined) updateFields.title = updates.title;
        if (updates.description !== undefined) updateFields.description = updates.description;
        if (updates.startTime !== undefined) updateFields.startTime = updates.startTime;
        if (updates.endTime !== undefined) updateFields.endTime = updates.endTime;
        if (updates.config !== undefined) updateFields.config = updates.config;
        if (updates.rewards !== undefined) updateFields.rewards = updates.rewards;
        if (updates.enabled !== undefined) updateFields.enabled = updates.enabled;

        const result = await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            call.succ({
                success: false,
                message: '活动不存在',
            });
            return;
        }

        // 记录操作日志
        await AdminUserSystem.logAdminAction(auth.adminId!, 'update_event', {
            eventId,
            updates: Object.keys(updateFields),
            timestamp: Date.now(),
        });

        call.succ({
            success: true,
            message: '活动更新成功',
        });

    } catch (error) {
        console.error('[ApiUpdateEvent] Error:', error);
        call.error('Internal server error');
    }
}
