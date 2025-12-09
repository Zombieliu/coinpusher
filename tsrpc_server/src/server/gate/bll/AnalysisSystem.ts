import { MongoDBService } from "../db/MongoDBService";
import { UserDB } from "../data/UserDB";

export class AnalysisSystem {
    
    /**
     * 计算LTV (生命周期价值)
     * 返回不同注册时间段用户的平均付费金额
     */
    static async getLTVStats(days: number = 30): Promise<{ date: string; ltv: number; newUserCount: number }[]> {
        const usersCollection = MongoDBService.getCollection('users');
        const paymentCollection = MongoDBService.getCollection('payment_orders');
        
        const now = Date.now();
        const stats: any[] = [];

        // 简化计算：按注册日期分组，统计这些用户的总充值
        // 注意：这是精确LTV的近似算法，实际大体量LTV需要专门的数仓
        
        for (let i = 0; i < days; i++) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
            const dateStr = date.toISOString().split('T')[0];

            // 1. 当天注册用户数
            const users = await usersCollection.find({
                createdAt: { $gte: startOfDay, $lt: endOfDay }
            }).toArray();
            
            const userIds = users.map(u => (u as any).userId);
            const newUserCount = userIds.length;

            if (newUserCount === 0) {
                stats.push({ date: dateStr, ltv: 0, newUserCount: 0 });
                continue;
            }

            // 2. 这些用户截止目前的总充值
            const revenueResult = await paymentCollection.aggregate([
                {
                    $match: {
                        userId: { $in: userIds },
                        status: { $in: ['paid', 'delivered'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]).toArray();

            const totalRevenue = revenueResult[0]?.total || 0;
            const ltv = totalRevenue / newUserCount;

            stats.push({ date: dateStr, ltv, newUserCount });
        }

        return stats.reverse(); // 按时间正序
    }

    /**
     * 计算留存率 (Retention)
     * 次日、3日、7日
     */
    static async getRetentionStats(days: number = 7): Promise<{ date: string; d1: number; d3: number; d7: number }[]> {
        // 依赖登录日志。如果没有登录日志表，只能返回空数据或模拟数据。
        // 假设我们有一个 user_login_logs 表 (userId, loginAt)
        const loginCollection = MongoDBService.getCollection('user_login_logs');
        const usersCollection = MongoDBService.getCollection('users');
        
        const now = Date.now();
        const stats: any[] = [];

        // 检查是否有登录日志集合
        const hasLogs = await MongoDBService.collectionExist('user_login_logs');
        if (!hasLogs) {
            // 如果没有日志，返回模拟数据或空
            return [];
        }

        for (let i = 0; i < days; i++) {
            const date = new Date(now - (i + 1) * 24 * 60 * 60 * 1000); // 至少从昨天开始算次日留存
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
            const dateStr = date.toISOString().split('T')[0];

            // 当日注册用户
            const newUsers = await usersCollection.find({
                createdAt: { $gte: startOfDay, $lt: endOfDay }
            }).toArray();
            
            const newUserIds = newUsers.map(u => (u as any).userId);
            const count = newUserIds.length;

            if (count === 0) {
                stats.push({ date: dateStr, d1: 0, d3: 0, d7: 0 });
                continue;
            }

            // 计算留存
            const getRetention = async (dayOffset: number) => {
                const targetStart = startOfDay + dayOffset * 24 * 60 * 60 * 1000;
                const targetEnd = targetStart + 24 * 60 * 60 * 1000;
                
                // 在目标日登录过的用户
                const activeCount = await loginCollection.countDocuments({
                    userId: { $in: newUserIds },
                    loginAt: { $gte: targetStart, $lt: targetEnd }
                });
                
                return (activeCount / count) * 100;
            };

            const d1 = await getRetention(1);
            const d3 = await getRetention(3);
            const d7 = await getRetention(7);

            stats.push({ date: dateStr, d1, d3, d7 });
        }

        return stats.reverse();
    }
}
