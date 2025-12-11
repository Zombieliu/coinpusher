import { ApiCall } from "tsrpc";
import { ReqUpdateOrderStatus, ResUpdateOrderStatus } from "../../../../tsrpc/protocols/gate/admin/PtlUpdateOrderStatus";
import { PaymentSystem } from "../../bll/PaymentSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiUpdateOrderStatus(call: ApiCall<ReqUpdateOrderStatus, ResUpdateOrderStatus>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageFinance);
    if (!auth.authorized) {
        return;
    }

    try {
        const result = await PaymentSystem.updateOrderStatus(call.req.orderId, call.req.status, {
            adminId: auth.adminId,
            adminRole: auth.role!,
            adminName: auth.username,
        });
        if (!result.success) {
            call.error(result.error || '更新订单状态失败');
            return;
        }

        call.succ({ success: true });
    } catch (e: any) {
        call.error(e.message);
    }
}
