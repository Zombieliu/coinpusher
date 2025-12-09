import { ReqGetUsers, ResGetUsers } from "../../../../tsrpc/protocols/gate/admin/PtlGetUsers";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { UserDB } from "../../data/UserDB";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'admin/GetUsers';

export async function ApiGetUsers(
    call: ApiCall<ReqGetUsers, ResGetUsers>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ViewUsers
    );
    if (!auth.authorized) return;

    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        const page = call.req.page || 1;
        const limit = call.req.limit || 20;
        const skip = (page - 1) * limit;
        const search = call.req.search || '';
        const status = call.req.status || 'all';

        // 构建查询条件
        const query: any = {};

        if (search) {
            query.$or = [
                { userId: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        if (status !== 'all') {
            query.status = status;
        }

        // 查询用户（使用字段投影，只查询需要的字段）
        const usersCollection = MongoDBService.getCollection('users');

        const [users, total] = await Promise.all([
            usersCollection
                .find(query)
                .project({
                    // 只投影需要的字段
                    userId: 1,
                    username: 1,
                    gold: 1,
                    tickets: 1,
                    lastLoginTime: 1,
                    status: 1,
                    createdAt: 1,
                    email: 1,
                    // 排除敏感字段
                    _id: 0
                })
                .sort({ lastLoginTime: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            usersCollection.countDocuments(query)
        ]);

        // 批量获取用户ID列表
        const userIds = users.map(u => u.userId);

        // 使用聚合管道批量查询关联数据（避免N+1问题）
        const [levelDataMap, vipDataMap, rechargeDataMap] = await Promise.all([
            // 批量查询等级数据
            MongoDBService.getCollection('level_data')
                .find({ userId: { $in: userIds } })
                .project({ userId: 1, level: 1, _id: 0 })
                .toArray()
                .then(results => new Map(results.map(r => [r.userId, r]))),

            // 批量查询VIP数据
            MongoDBService.getCollection('vip_data')
                .find({ userId: { $in: userIds } })
                .project({ userId: 1, vipLevel: 1, _id: 0 })
                .toArray()
                .then(results => new Map(results.map(r => [r.userId, r]))),

            // 批量计算总充值（一次聚合查询）
            MongoDBService.getCollection('payment_orders')
                .aggregate([
                    {
                        $match: {
                            userId: { $in: userIds },
                            status: 'paid'
                        }
                    },
                    {
                        $group: {
                            _id: '$userId',
                            total: { $sum: '$amount' }
                        }
                    }
                ])
                .toArray()
                .then(results => new Map(results.map(r => [r._id, r.total])))
        ]);

        // 组合数据（内存操作，无额外查询）
        const result = users.map(user => ({
            userId: user.userId,
            username: user.username,
            level: levelDataMap.get(user.userId)?.level || 1,
            gold: user.gold || 0,
            tickets: user.tickets || 0,
            lastLoginTime: user.lastLoginTime || 0,
            totalRecharge: rechargeDataMap.get(user.userId) || 0,
            status: user.status || 'normal',
            createdAt: user.createdAt || Date.now(),
            email: user.email,
            vipLevel: vipDataMap.get(user.userId)?.vipLevel || 0,
        }));

        call.succ({
            users: result,
            total,
            page,
            limit,
        });
        success = true;

    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'internal_error');
        console.error('[ApiGetUsers] Error:', error);
        call.error('Internal server error');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}

