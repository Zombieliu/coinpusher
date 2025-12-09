import { ReqGetStatistics, ResGetStatistics } from "../../../../tsrpc/protocols/gate/admin/PtlGetStatistics";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

/**
 * 管理员API - 获取统计数据
 */

const ENDPOINT = 'admin/GetStatistics';

export async function ApiGetStatistics(
    call: ApiCall<ReqGetStatistics, ResGetStatistics>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ViewStatistics
    );
    if (!auth.authorized) return;

    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        const now = Date.now();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayTimestamp = todayStart.getTime();

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthTimestamp = monthStart.getTime();

        // 获取用户统计
        const usersCollection = MongoDBService.getCollection('users');
        const totalUsers = await usersCollection.countDocuments({});
        const newUsers = await usersCollection.countDocuments({
            createdAt: { $gte: todayTimestamp }
        });

        // DAU - 今日登录用户
        const dau = await usersCollection.countDocuments({
            lastLoginTime: { $gte: todayTimestamp }
        });

        // MAU - 本月登录用户
        const mau = await usersCollection.countDocuments({
            lastLoginTime: { $gte: monthTimestamp }
        });

        // 在线人数（最近5分钟活跃）
        const onlinePlayers = await usersCollection.countDocuments({
            lastLoginTime: { $gte: now - 5 * 60 * 1000 }
        });

        // 收入统计
        const ordersCollection = MongoDBService.getCollection('payment_orders');

        // 总收入
        const totalRevenueResult = await ordersCollection.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).toArray();
        const totalRevenue = totalRevenueResult[0]?.total || 0;

        // 今日收入
        const todayRevenueResult = await ordersCollection.aggregate([
            {
                $match: {
                    status: 'paid',
                    paidAt: { $gte: todayTimestamp }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).toArray();
        const todayRevenue = todayRevenueResult[0]?.total || 0;

        // 付费用户数
        const payingUsers = await ordersCollection.distinct('userId', { status: 'paid' });
        const payingUserCount = payingUsers.length;

        // 计算ARPU和ARPPU
        const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;
        const arppu = payingUserCount > 0 ? totalRevenue / payingUserCount : 0;
        const payRate = totalUsers > 0 ? payingUserCount / totalUsers : 0;

        // 对局统计（假设有matches集合）
        const matchesCollection = MongoDBService.getCollection('matches');
        const totalMatches = await matchesCollection.countDocuments({});

        // 平均游戏时长（模拟数据）
        const avgSessionTime = 25; // 25分钟

        call.succ({
            totalUsers,
            activeUsers: onlinePlayers,  // 协议要求的字段
            totalRevenue,
            newUsersToday: newUsers,     // 协议要求的字段
            // 额外的统计数据
            dau,
            mau,
            todayRevenue,
            arpu,
            arppu,
            payRate,
            totalMatches,
            avgSessionTime,
        });
        success = true;

    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'stats_failed');
        console.error('[ApiGetStatistics] Error:', error);
        call.error('Internal server error');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}

