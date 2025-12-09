import { ApiCall } from "tsrpc";
import { ReqGetRefunds, ResGetRefunds } from "../../../../tsrpc/protocols/gate/admin/PtlGetRefunds";
import { PaymentSystem } from "../../bll/PaymentSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetRefunds(call: ApiCall<ReqGetRefunds, ResGetRefunds>) {
    // 权限检查
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewFinance);
    if (!auth.authorized) return;

    try {
        const { refunds, total } = await PaymentSystem.getRefundRequests(
            call.req.status,
            call.req.page,
            call.req.limit
        );

        call.succ({
            success: true,
            refunds,
            total
        });
    } catch (e: any) {
        call.error(e.message);
    }
}
