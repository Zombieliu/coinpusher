import { ApiCall } from "tsrpc";
import { ReqUnbanUser, ResUnbanUser } from "../../../../tsrpc/protocols/gate/admin/PtlUnbanUser";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { NotificationSystem } from "../../bll/NotificationSystem";

export default async function (call: ApiCall<ReqUnbanUser, ResUnbanUser>) {
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.BanUsers
    );
    if (!auth.authorized) {
        return;
    }

    const { userId } = call.req;
    if (!userId?.trim()) {
        call.succ({
            success: false,
            message: '缺少用户ID'
        });
        return;
    }

    try {
        const usersCollection = MongoDBService.getCollection('users');
        const result = await usersCollection.updateOne(
            { userId },
            {
                $set: { status: 'normal' },
                $unset: { bannedAt: '', bannedUntil: '', bannedReason: '' }
            }
        );

        if (result.matchedCount === 0) {
            call.succ({
                success: false,
                message: '用户不存在'
            });
            return;
        }

        const adminId = auth.adminId ?? 'unknown';
        const adminName = auth.username ?? adminId;

        await logAdminAction(adminId, {
            action: 'unban_user',
            targetUserId: userId,
            timestamp: Date.now()
        });

        NotificationSystem.notifyUserUnbanned(userId, adminName);

        call.succ({
            success: true,
            message: result.modifiedCount === 0 ? '用户已是正常状态' : '解封成功'
        });

    } catch (error) {
        console.error('[ApiUnbanUser] Error:', error);
        call.error('Internal server error');
    }
}

async function logAdminAction(adminId: string, action: Record<string, any>): Promise<void> {
    try {
        const logsCollection = MongoDBService.getCollection('admin_logs');
        await logsCollection.insertOne({ ...action, adminId });
    } catch (error) {
        console.error('[ApiUnbanUser] logAdminAction error:', error);
    }
}
