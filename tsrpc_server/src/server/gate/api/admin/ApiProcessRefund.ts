import { ApiCall } from "tsrpc";
import { ReqProcessRefund, ResProcessRefund } from "../../../../tsrpc/protocols/gate/admin/PtlProcessRefund";
import { PaymentSystem } from "../../bll/PaymentSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiProcessRefund(call: ApiCall<ReqProcessRefund, ResProcessRefund>) {
    // 权限检查 - 只有拥有 ManageFinance 权限的管理员可以处理退款
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageFinance);
    if (!auth.authorized) return;

    try {
        const result = await PaymentSystem.processRefund(
            call.req.refundId,
            call.req.approved,
            {
                adminId: auth.adminId,
                adminName: auth.username,
                note: call.req.note
            }
        );

        if (!result.success) {
            call.error(result.error || '处理退款失败');
            return;
        }

        call.succ({
            success: true
        });
    } catch (e: any) {
        call.error(e.message);
    }
}
