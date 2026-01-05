import { ApiCall } from "tsrpc";
import { ReqResolveReconcileFlag, ResResolveReconcileFlag } from "../../../../tsrpc/protocols/gate/admin/PtlResolveReconcileFlag";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminUserSystem } from "../../bll/AdminUserSystem";
import { MongoDBService } from "../../db/MongoDBService";
import { PaymentSystem } from "../../bll/PaymentSystem";
import { ObjectId } from "mongodb";

export async function ApiResolveReconcileFlag(call: ApiCall<ReqResolveReconcileFlag, ResResolveReconcileFlag>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewFinance);
    if (!auth.authorized) return;

    try {
        const { flagId, action, note } = call.req;
        const collection = MongoDBService.getCollection('payment_reconcile_flags');
        const flag = await collection.findOne({ _id: new ObjectId(flagId) });
        if (!flag) {
            call.succ({ success: false, error: '记录不存在' });
            return;
        }

        let message = '';

        if (action === 'confirm') {
            if (!flag.intentId) {
                call.succ({ success: false, error: '缺少 intentId，无法补单' });
                return;
            }
            const res = await PaymentSystem.confirmStripeIntent(flag.intentId);
            if (!res.success) {
                call.succ({ success: false, error: res.error || '补单失败' });
                return;
            }
            message = '已尝试补单并同步发货';
        } else {
            message = note || '已标记处理';
        }

        await collection.updateOne(
            { _id: new ObjectId(flagId) },
            {
                $set: {
                    resolved: true,
                    resolvedAt: Date.now(),
                    resolutionMessage: message
                }
            }
        );

        await AdminUserSystem.logAdminAction(auth.admin!.adminId, 'reconcile_flag_resolve', {
            flagId,
            action,
            note: message
        });

        call.succ({ success: true, message });
    } catch (err: any) {
        call.succ({ success: false, error: err?.message || '处理失败' });
    }
}
