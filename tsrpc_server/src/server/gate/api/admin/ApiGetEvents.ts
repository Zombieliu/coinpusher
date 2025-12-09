import { ReqGetEvents, ResGetEvents } from "../../../../tsrpc/protocols/gate/admin/PtlGetEvents";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";



export async function ApiGetEvents(
    call: ApiCall<ReqGetEvents, ResGetEvents>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ViewEvents
    );
    if (!auth.authorized) return;

    try {
        const { status = 'all', page = 1, limit = 20 } = call.req;
        const skip = (page - 1) * limit;
        const now = Date.now();

        // 构建查询条件
        const query: any = {};

        if (status !== 'all') {
            switch (status) {
                case 'upcoming':
                    query.startTime = { $gt: now };
                    break;
                case 'active':
                    query.startTime = { $lte: now };
                    query.endTime = { $gte: now };
                    break;
                case 'ended':
                    query.endTime = { $lt: now };
                    break;
            }
        }

        const eventsCollection = MongoDBService.getCollection('events');

        const events = await eventsCollection
            .find(query)
            .sort({ startTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await eventsCollection.countDocuments(query);

        // 计算每个活动的状态
        const result = events
            .filter(event => event.eventType) // 过滤掉没有 eventType 的无效事件
            .map(event => {
                let eventStatus: 'upcoming' | 'active' | 'ended';
                if (now < event.startTime) {
                    eventStatus = 'upcoming';
                } else if (now >= event.startTime && now <= event.endTime) {
                    eventStatus = 'active';
                } else {
                    eventStatus = 'ended';
                }

                return {
                    eventId: event._id?.toString() || '',
                    eventType: event.eventType,
                    title: event.title || '',
                    description: event.description || '',
                    startTime: event.startTime || 0,
                    endTime: event.endTime || 0,
                    status: eventStatus,
                    config: event.config || {},
                    rewards: event.rewards || [],
                    createdAt: event.createdAt,
                    createdBy: event.createdBy,
                    updatedAt: event.updatedAt,
                    updatedBy: event.updatedBy,
                };
            });

        call.succ({
            events: result,
            total,
            page,
            limit,
        });

    } catch (error) {
        console.error('[ApiGetEvents] Error:', error);
        call.error('Internal server error');
    }
}
