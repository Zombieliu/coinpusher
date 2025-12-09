import { ApiCall } from "tsrpc";
import { ReqGetUserDetail, ResGetUserDetail } from "../../../../tsrpc/protocols/gate/admin/PtlGetUserDetail";
import { UserDB } from "../../data/UserDB";
import { PaymentSystem } from "../../bll/PaymentSystem";
import { LevelSystem } from "../../bll/LevelSystem";
import { VIPSystem } from "../../bll/VIPSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'admin/GetUserDetail';

export async function ApiGetUserDetail(call: ApiCall<ReqGetUserDetail, ResGetUserDetail>) {
    // 权限检查
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewUsers);
    if (!auth.authorized) return;

    const { userId } = call.req;

    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        // 1. 获取基础信息
        const user = await UserDB.getUserById(userId);
        if (!user) {
            call.error('用户不存在');
            return;
        }

        // 2. 并行获取扩展信息
        const [paymentStats, levelData, vipData] = await Promise.all([
            PaymentSystem.getPaymentStats(userId),
            LevelSystem.getUserLevel(userId),
            VIPSystem.getUserVIP(userId)
        ]);

        // 3. 组装响应
        call.succ({
            success: true,
            user: {
                userId: user.userId,
                username: user.username,
                // nickname: user.nickname, // UserDB中暂无，如果以后加了可以补上
                // avatar: user.avatar,
                
                gold: user.gold,
                tickets: user.tickets,
                exp: levelData?.exp || 0,
                level: levelData?.level || 1,
                vipLevel: vipData?.vipLevel || 0,
                
                status: (user as any).banned ? 'banned' : 'active',
                createdAt: (user as any).createdAt || 0,
                lastLoginTime: user.lastLoginTime,
                lastLoginIp: (user as any).lastLoginIp,
                
                totalRecharge: paymentStats.totalRevenue,
                totalGames: user.totalDrops || 0, // 使用投币次数作为局数近似值
                
                inventory: user.inventory,
                
                tags: calculateTags(paymentStats.totalRevenue, user.lastLoginTime)
            }
        });
        success = true;

    } catch (e: any) {
        recordApiError('POST', ENDPOINT, e?.message || 'user_detail_error');
        call.error(e?.message || '获取用户详情失败');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}

function calculateTags(totalRecharge: number, lastLoginTime: number): string[] {
    const tags: string[] = [];
    const now = Date.now();
    
    // 大R判定
    if (totalRecharge >= 1000) tags.push('大R');
    else if (totalRecharge >= 100) tags.push('中R');
    
    // 活跃判定
    if (now - lastLoginTime < 24 * 60 * 60 * 1000) tags.push('活跃');
    else if (now - lastLoginTime > 30 * 24 * 60 * 60 * 1000) tags.push('流失');
    
    return tags;
}
