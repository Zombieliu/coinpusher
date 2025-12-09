import { ReqBatchBanUsers, ResBatchBanUsers } from "../../../../tsrpc/protocols/gate/admin/PtlBatchBanUsers";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminUserSystem } from "../../bll/AdminUserSystem";
import { NotificationSystem, NotificationType } from "../../bll/NotificationSystem";



export async function ApiBatchBanUsers(
    call: ApiCall<ReqBatchBanUsers, ResBatchBanUsers>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.BanUsers
    );
    if (!auth.authorized) return;

    try {
        const { userIds, reason, duration } = call.req;

        if (!userIds || userIds.length === 0) {
            call.error('userIds cannot be empty');
            return;
        }

        if (userIds.length > 100) {
            call.error('Maximum 100 users per batch');
            return;
        }

        const usersCollection = MongoDBService.getCollection('users');
        const details: Array<{ userId: string; success: boolean; message?: string }> = [];
        let successCount = 0;
        let failedCount = 0;

        // 批量封禁
        for (const userId of userIds) {
            try {
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

                if (result.modifiedCount > 0) {
                    successCount++;
                    details.push({ userId, success: true });
                } else {
                    failedCount++;
                    details.push({
                        userId,
                        success: false,
                        message: '用户不存在或已被封禁'
                    });
                }
            } catch (error: any) {
                failedCount++;
                details.push({
                    userId,
                    success: false,
                    message: error.message
                });
            }
        }

        // 记录操作日志
        await AdminUserSystem.logAdminAction(auth.adminId!, 'batch_ban_users', {
            userCount: userIds.length,
            successCount,
            failedCount,
            reason,
            duration,
            timestamp: Date.now(),
        });

        // 发送通知
        NotificationSystem.sendNotification({
            type: NotificationType.SystemAlert,
            title: '批量封禁完成',
            message: `已封禁 ${successCount}/${userIds.length} 个用户`,
            data: { successCount, failedCount },
            adminName: auth.username,
        });

        call.succ({
            success: true,
            successCount,
            failedCount,
            details,
        });

    } catch (error) {
        console.error('[ApiBatchBanUsers] Error:', error);
        call.error('Internal server error');
    }
}
