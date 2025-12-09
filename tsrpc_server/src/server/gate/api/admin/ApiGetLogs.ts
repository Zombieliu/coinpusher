import { ReqGetLogs, ResGetLogs } from "../../../../tsrpc/protocols/gate/admin/PtlGetLogs";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";



export async function ApiGetLogs(
    call: ApiCall<ReqGetLogs, ResGetLogs>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ViewLogs
    );
    if (!auth.authorized) return;

    try {
        const {
            type,
            startTime,
            endTime,
            userId,
            page = 1,
            limit = 50
        } = call.req;

        const skip = (page - 1) * limit;

        // 构建查询条件
        const query: any = {};

        if (type !== 'all') {
            if (type === 'admin') {
                const logsCollection = MongoDBService.getCollection('admin_logs');
                const logs = await logsCollection
                    .find(buildTimeQuery(startTime, endTime, userId))
                    .sort({ timestamp: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                const total = await logsCollection.countDocuments(
                    buildTimeQuery(startTime, endTime, userId)
                );

                call.succ({
                    logs: logs.map(formatLog),
                    total,
                    page,
                    limit
                });
                return;
            }

            // 其他类型日志可以从不同的集合获取
            // 这里作为示例返回空数据
        }

        // 'all' 类型 - 合并多个日志源
        const adminLogs = MongoDBService.getCollection('admin_logs');
        const logs = await adminLogs
            .find(buildTimeQuery(startTime, endTime, userId))
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await adminLogs.countDocuments(
            buildTimeQuery(startTime, endTime, userId)
        );

        call.succ({
            logs: logs.map(formatLog),
            total,
            page,
            limit
        });

    } catch (error) {
        console.error('[ApiGetLogs] Error:', error);
        call.error('Internal server error');
    }
}

function buildTimeQuery(startTime?: number, endTime?: number, userId?: string): any {
    const query: any = {};

    if (startTime || endTime) {
        query.timestamp = {};
        if (startTime) query.timestamp.$gte = startTime;
        if (endTime) query.timestamp.$lte = endTime;
    }

    if (userId) {
        query.$or = [
            { userId },
            { targetUserId: userId }
        ];
    }

    return query;
}

function formatLog(log: any): any {
    return {
        logId: log._id?.toString() || '',
        type: log.action?.split('_')[0] || 'unknown',
        action: log.action || 'unknown',
        adminId: log.adminId,
        userId: log.userId,
        targetUserId: log.targetUserId,
        details: {
            reason: log.reason,
            rewards: log.rewards,
            duration: log.duration,
            mailType: log.mailType,
            sentCount: log.sentCount,
        },
        timestamp: log.timestamp || Date.now(),
        ip: log.ip
    };
}
