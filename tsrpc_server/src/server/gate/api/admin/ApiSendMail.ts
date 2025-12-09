import { ReqSendMail, ResSendMail } from "../../../../tsrpc/protocols/gate/admin/PtlSendMail";

import { ApiCall } from "tsrpc";
import { MailSystem, MailType } from "../../bll/MailSystem";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";



export async function ApiSendMail(
    call: ApiCall<ReqSendMail, ResSendMail>
) {
    // 验证管理员权限 - 广播邮件需要额外权限
    const requiredPermission = call.req.type === 'broadcast'
        ? AdminPermission.SendBroadcastMail
        : AdminPermission.SendMail;

    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        requiredPermission
    );
    if (!auth.authorized) return;

    try {
        const { type, userIds, title, content, rewards, expireAt } = call.req;

        if (!title || !content) {
            call.error('标题和内容不能为空');
            return;
        }

        let targetUserIds: string[] = [];

        // 根据类型确定收件人
        if (type === 'single') {
            if (!userIds || userIds.length === 0) {
                call.error('单人邮件必须指定用户ID');
                return;
            }
            targetUserIds = [userIds[0]];
        } else if (type === 'batch') {
            if (!userIds || userIds.length === 0) {
                call.error('批量邮件必须指定用户ID列表');
                return;
            }
            targetUserIds = userIds;
        } else if (type === 'broadcast') {
            // 全服邮件 - 获取所有用户
            const usersCollection = MongoDBService.getCollection('users');
            const allUsers = await usersCollection
                .find({}, { projection: { userId: 1 } })
                .toArray();
            targetUserIds = allUsers.map(u => u.userId);
        }

        // 批量发送邮件
        let sentCount = 0;
        const sender = auth.username || 'System';
        const expiresIn = expireAt ? Math.max(expireAt - Date.now(), 0) : undefined;
        for (const userId of targetUserIds) {
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
                    sentCount++;
                } else {
                    console.warn(`[ApiSendMail] Failed to send to ${userId}: ${result.error}`);
                }
            } catch (error) {
                console.error(`[ApiSendMail] Failed to send to ${userId}:`, error);
            }
        }

        // 记录操作日志
        await logAdminAction(auth.adminId!, {
            action: 'send_mail',
            mailType: type,
            recipientCount: targetUserIds.length,
            sentCount,
            title,
            hasRewards: !!rewards,
            timestamp: Date.now()
        });

        call.succ({
            success: true,
            sentCount,
            message: `成功发送 ${sentCount}/${targetUserIds.length} 封邮件`
        });

    } catch (error) {
        console.error('[ApiSendMail] Error:', error);
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
