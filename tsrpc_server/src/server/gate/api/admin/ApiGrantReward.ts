import { ReqGrantReward, ResGrantReward } from "../../../../tsrpc/protocols/gate/admin/PtlGrantReward";

import { ApiCall } from "tsrpc";
import { UserDB } from "../../data/UserDB";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";



export async function ApiGrantReward(
    call: ApiCall<ReqGrantReward, ResGrantReward>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.GrantRewards
    );
    if (!auth.authorized) return;

    try {
        const { userId, rewards, reason } = call.req;

        // 验证用户存在
        const user = await UserDB.getUserById(userId);
        if (!user) {
            call.succ({
                success: false,
                message: '用户不存在'
            });
            return;
        }

        // 发放金币
        if (rewards.gold && rewards.gold > 0) {
            await UserDB.addGold(userId, rewards.gold);
        }

        // 发放彩票
        if (rewards.tickets && rewards.tickets > 0) {
            await UserDB.addTickets(userId, rewards.tickets);
        }

        // 发放经验
        if (rewards.exp && rewards.exp > 0) {
            const { LevelSystem, ExpSource } = await import('../../bll/LevelSystem');
            await LevelSystem.addExp(userId, rewards.exp, ExpSource.Admin);
        }

        // 发放道具
        if (rewards.items && rewards.items.length > 0) {
            const { ItemSystem } = await import('../../bll/ItemSystem');
            for (const item of rewards.items) {
                await ItemSystem.addItem(userId, item.itemId, item.quantity);
            }
        }

        // 发放皮肤
        if (rewards.skins && rewards.skins.length > 0) {
            const { SkinSystem } = await import('../../bll/SkinSystem');
            for (const skinId of rewards.skins) {
                await SkinSystem.unlockSkin(userId, skinId);
            }
        }

        // 发放VIP
        if (rewards.vipDays && rewards.vipDays > 0) {
            const { VIPSystem } = await import('../../bll/VIPSystem');
            // 假设VIP等级1，可以根据需求调整
            await VIPSystem.activateVIP(userId, 1, rewards.vipDays);
        }

        // 记录操作日志
        await logAdminAction(auth.adminId!, {
            action: 'grant_reward',
            targetUserId: userId,
            rewards,
            reason: reason || '管理员发放',
            timestamp: Date.now()
        });

        call.succ({
            success: true,
            message: '奖励发放成功'
        });

    } catch (error) {
        console.error('[ApiGrantReward] Error:', error);
        call.error('Internal server error');
    }
}

async function logAdminAction(adminId: string, action: any): Promise<void> {
    try {
        const logsCollection = MongoDBService.getCollection('admin_logs');
        await logsCollection.insertOne({ ...action, adminId });
    } catch (error) {
        console.error('[logAdminAction] Error:', error);
    }
}
