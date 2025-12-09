import { ReqBanUser, ResBanUser } from "../../../../tsrpc/protocols/gate/admin/PtlBanUser";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";



export async function ApiBanUser(
    call: ApiCall<ReqBanUser, ResBanUser>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.BanUsers
    );
    if (!auth.authorized) return;

    try {
        const { userId, reason, duration } = call.req;

        if (!userId) {
            call.error('Invalid userId');
            return;
        }

        // 更新用户状态
        const usersCollection = MongoDBService.getCollection('users');
        const result = await usersCollection.updateOne(
            { userId },
            {
                $set: {
                    status: 'banned',
                    bannedAt: Date.now(),
                    bannedUntil: Date.now() + duration,
                    bannedReason: reason
                }
            }
        );

        if (result.modifiedCount === 0) {
            call.succ({
                success: false,
                message: '用户不存在或已被封禁'
            });
            return;
        }

        // 记录操作日志
        await logAdminAction(auth.adminId!, {
            action: 'ban_user',
            targetUserId: userId,
            reason,
            duration,
            timestamp: Date.now()
        });

        // 发送实时通知
        const { NotificationSystem } = await import('../../bll/NotificationSystem');
        NotificationSystem.notifyUserBanned(userId, reason, auth.username!);

        call.succ({
            success: true,
            message: '封禁成功'
        });

    } catch (error) {
        console.error('[ApiBanUser] Error:', error);
        call.error('Internal server error');
    }
}

export async function ApiUnbanUser(
    call: ApiCall<{ __ssoToken?: string; userId: string }, ResBanUser>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.BanUsers
    );
    if (!auth.authorized) return;

    try {
        const { userId } = call.req;

        // 更新用户状态
        const usersCollection = MongoDBService.getCollection('users');
        const result = await usersCollection.updateOne(
            { userId },
            {
                $set: { status: 'normal' },
                $unset: { bannedAt: '', bannedUntil: '', bannedReason: '' }
            }
        );

        if (result.modifiedCount === 0) {
            call.succ({
                success: false,
                message: '用户不存在'
            });
            return;
        }

        // 记录操作日志
        await logAdminAction(auth.adminId!, {
            action: 'unban_user',
            targetUserId: userId,
            timestamp: Date.now()
        });

        call.succ({
            success: true,
            message: '解封成功'
        });

    } catch (error) {
        console.error('[ApiUnbanUser] Error:', error);
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
