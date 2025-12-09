import { ReqGetLogAnalytics, ResGetLogAnalytics } from "../../../../tsrpc/protocols/gate/admin/PtlGetLogAnalytics";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'admin/GetLogAnalytics';


export async function ApiGetLogAnalytics(
    call: ApiCall<ReqGetLogAnalytics, ResGetLogAnalytics>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ViewLogs
    );
    if (!auth.authorized) return;

    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        const now = Date.now();
        const { startTime = now - 30 * 24 * 60 * 60 * 1000, endTime = now } = call.req;

        const logsCollection = MongoDBService.getCollection('admin_logs');

        // 1. 操作类型统计
        const actionStatsResult = await logsCollection.aggregate([
            {
                $match: {
                    timestamp: { $gte: startTime, $lte: endTime }
                }
            },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            }
        ]).toArray();

        const totalOperations = actionStatsResult.reduce((sum, item) => sum + item.count, 0);

        const actionStats = actionStatsResult.map(item => ({
            action: item._id || 'unknown',
            count: item.count,
            percentage: totalOperations > 0 ? (item.count / totalOperations) * 100 : 0
        }));

        // 2. 管理员活跃度统计
        const adminStatsResult = await logsCollection.aggregate([
            {
                $match: {
                    timestamp: { $gte: startTime, $lte: endTime }
                }
            },
            {
                $group: {
                    _id: '$adminId',
                    operationCount: { $sum: 1 },
                    lastOperation: { $max: '$timestamp' }
                }
            },
            {
                $sort: { operationCount: -1 }
            }
        ]).toArray();

        // 获取管理员名称
        const adminUsersCollection = MongoDBService.getCollection('admin_users');
        const adminStats = await Promise.all(
            adminStatsResult.map(async (item) => {
                const admin = await adminUsersCollection.findOne({ adminId: item._id });
                return {
                    adminId: item._id,
                    adminName: admin?.username,
                    operationCount: item.operationCount,
                    lastOperation: item.lastOperation
                };
            })
        );

        const activeAdmins = adminStats.length;

        // 3. 小时分布统计
        const timeDistributionResult = await logsCollection.aggregate([
            {
                $match: {
                    timestamp: { $gte: startTime, $lte: endTime }
                }
            },
            {
                $project: {
                    hour: { $hour: { date: { $toDate: '$timestamp' }, timezone: '+08:00' } }
                }
            },
            {
                $group: {
                    _id: '$hour',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]).toArray();

        const timeDistribution = Array.from({ length: 24 }, (_, hour) => {
            const found = timeDistributionResult.find(item => item._id === hour);
            return {
                hour,
                count: found ? found.count : 0
            };
        });

        // 4. 每日趋势（最近7天）
        const dailyTrendResult = await logsCollection.aggregate([
            {
                $match: {
                    timestamp: { $gte: now - 7 * 24 * 60 * 60 * 1000, $lte: now }
                }
            },
            {
                $project: {
                    date: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: { $toDate: '$timestamp' },
                            timezone: '+08:00'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$date',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]).toArray();

        const dailyTrend = dailyTrendResult.map(item => ({
            date: item._id,
            count: item.count
        }));

        // 5. 最常见操作
        const mostCommonAction = actionStats[0]?.action || 'none';

        call.succ({
            actionStats,
            adminStats,
            timeDistribution,
            dailyTrend,
            totalOperations,
            activeAdmins,
            mostCommonAction,
        });
        success = true;

    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'log_analytics_failed');
        console.error('[ApiGetLogAnalytics] Error:', error);
        call.error('Internal server error');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
