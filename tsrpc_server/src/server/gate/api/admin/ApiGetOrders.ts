import { ApiCall } from "tsrpc";
import { ReqGetOrders, ResGetOrders } from "../../../../tsrpc/protocols/gate/admin/PtlGetOrders";
import { PaymentSystem } from "../../bll/PaymentSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetOrders(call: ApiCall<ReqGetOrders, ResGetOrders>) {
    // 权限检查
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewFinance);
    if (!auth.authorized) return;

    try {
        const { orders, total } = await PaymentSystem.getOrders(
            {
                userId: call.req.userId,
                status: call.req.status,
                orderId: call.req.orderId,
                startDate: call.req.startDate,
                endDate: call.req.endDate
            },
            call.req.page,
            call.req.limit
        );

        call.succ({
            success: true,
            orders,
            total
        });
    } catch (e: any) {
        call.error(e.message);
    }
}
