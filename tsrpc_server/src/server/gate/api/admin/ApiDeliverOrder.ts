import { ApiCall } from "tsrpc";
import { ReqDeliverOrder, ResDeliverOrder } from "../../../../tsrpc/protocols/gate/admin/PtlDeliverOrder";
import { PaymentSystem } from "../../bll/PaymentSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiDeliverOrder(call: ApiCall<ReqDeliverOrder, ResDeliverOrder>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageFinance);
    if (!auth.authorized) return;

    try {
        const result = await PaymentSystem.manualDeliverOrder(call.req.orderId, {
            adminId: auth.adminId,
            adminRole: auth.role!,
            adminName: auth.username,
        });
        if (!result.success) {
            call.error(result.error || '发货失败');
            return;
        }
        call.succ({ success: true });
    } catch (error: any) {
        call.error(error.message);
    }
}
