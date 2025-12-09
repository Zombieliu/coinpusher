import { ReqBatchSendMail, ResBatchSendMail } from "../../../../tsrpc/protocols/gate/admin/PtlBatchSendMail";

import { ApiCall } from "tsrpc";
import { MailSystem, MailType } from "../../bll/MailSystem";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminUserSystem } from "../../bll/AdminUserSystem";
import { NotificationSystem } from "../../bll/NotificationSystem";



export async function ApiBatchSendMail(
    call: ApiCall<ReqBatchSendMail, ResBatchSendMail>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.SendMail
    );
    if (!auth.authorized) return;

    try {
        const { userIds, title, content, rewards, expireAt } = call.req;

        if (!title || !content) {
            call.error('标题和内容不能为空');
            return;
        }

        if (!userIds || userIds.length === 0) {
            call.error('用户列表不能为空');
            return;
        }

        if (userIds.length > 1000) {
            call.error('单次最多发送1000封邮件');
            return;
        }

        let successCount = 0;
        let failedCount = 0;
        const details: Array<{ userId: string; success: boolean; message?: string }> = [];
        const sender = auth.username || 'System';
        const expiresIn = expireAt ? Math.max(expireAt - Date.now(), 0) : undefined;

        // 批量发送邮件
        for (const userId of userIds) {
            try {
                const result = await MailSystem.sendMail(
                    userId,
                    MailType.Admin,
                    title,
                    content,
                    sender,
                    rewards,
                    expiresIn
                );
                if (result.success) {
                    successCount++;
                    details.push({ userId, success: true });
                } else {
                    failedCount++;
                    details.push({
                        userId,
                        success: false,
                        message: result.error || '发送失败'
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
        await AdminUserSystem.logAdminAction(auth.adminId!, 'batch_send_mail', {
            userCount: userIds.length,
            successCount,
            failedCount,
            title,
            hasRewards: !!rewards,
            timestamp: Date.now(),
        });

        // 发送通知
        NotificationSystem.notifyMailSent('batch', successCount, auth.username!);

        call.succ({
            success: true,
            successCount,
            failedCount,
            details: failedCount > 0 ? details : undefined,
        });

    } catch (error) {
        console.error('[ApiBatchSendMail] Error:', error);
        call.error('Internal server error');
    }
}
