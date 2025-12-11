import { MongoDBService } from "../db/MongoDBService";
import { AdminRole } from "./AdminUserSystem";
import { NotificationSystem, NotificationType } from "./NotificationSystem";

type FinanceAction =
    | 'admin/DeliverOrder'
    | 'admin/ResendOrderReward'
    | 'admin/UpdateOrderStatus'
    | 'admin/ProcessRefund';

interface ActionContext {
    adminId: string;
    adminRole: AdminRole;
    adminName?: string;
    amount?: number;
    orderId?: string;
    refundId?: string;
}

const ACTION_LIMITS: Record<FinanceAction, { limit: number; label: string }> = {
    'admin/DeliverOrder': { limit: Number(process.env.FINANCE_DELIVER_LIMIT || 20), label: '标记发货' },
    'admin/ResendOrderReward': { limit: Number(process.env.FINANCE_RESEND_LIMIT || 20), label: '重发奖励' },
    'admin/UpdateOrderStatus': { limit: Number(process.env.FINANCE_STATUS_LIMIT || 50), label: '更新订单状态' },
    'admin/ProcessRefund': { limit: Number(process.env.FINANCE_REFUND_LIMIT || 15), label: '处理退款' },
};

const HIGH_VALUE_THRESHOLD = Number(process.env.FINANCE_HIGH_VALUE_THRESHOLD || 500);
const ONE_DAY = 24 * 60 * 60 * 1000;

export class FinanceSecurityGuard {
    static async ensureOrderActionAllowed(
        action: FinanceAction,
        context: ActionContext
    ): Promise<void> {
        await this.enforceQuota(action, context);
        await this.enforceHighValueGuard(action, context);
    }

    static async ensureRefundActionAllowed(
        context: ActionContext & { approved: boolean }
    ): Promise<void> {
        await this.enforceQuota('admin/ProcessRefund', context);
        if (context.approved) {
            await this.enforceHighValueGuard('admin/ProcessRefund', context);
        }
    }

    private static async enforceQuota(action: FinanceAction, context: ActionContext) {
        if (!context.adminId || context.adminRole === AdminRole.SuperAdmin) {
            return;
        }
        const spec = ACTION_LIMITS[action];
        if (!spec?.limit) return;

        const since = Date.now() - ONE_DAY;
        const auditLogs = MongoDBService.getCollection<any>('audit_logs');
        const used = await auditLogs.countDocuments({
            adminId: context.adminId,
            action,
            createdAt: { $gte: since },
            result: 'success',
        });

        if (used >= spec.limit) {
            throw new Error(`已达到当日「${spec.label}」上限（${spec.limit} 次），请联系超级管理员处理。`);
        }
    }

    private static async enforceHighValueGuard(action: FinanceAction, context: ActionContext) {
        if (!context.amount || context.amount < HIGH_VALUE_THRESHOLD) {
            return;
        }
        if (context.adminRole === AdminRole.SuperAdmin) {
            return;
        }

        const target = context.orderId || context.refundId || '未知';
        const message = `高金额操作需超级管理员审批。操作:${action}，对象:${target}，金额:${context.amount}`;
        NotificationSystem.sendNotification({
            type: NotificationType.SystemAlert,
            title: '高风险财务操作阻拦',
            message,
            data: {
                action,
                target,
                amount: context.amount,
                adminId: context.adminId,
                adminName: context.adminName,
            },
        });
        throw new Error('该操作金额较大，仅允许超级管理员执行。');
    }
}
