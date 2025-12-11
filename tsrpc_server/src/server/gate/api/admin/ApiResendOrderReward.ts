import { ApiCall } from "tsrpc";
import { ReqResendOrderReward, ResResendOrderReward } from "../../../../tsrpc/protocols/gate/admin/PtlResendOrderReward";
import { PaymentSystem } from "../../bll/PaymentSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiResendOrderReward(call: ApiCall<ReqResendOrderReward, ResResendOrderReward>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ManageFinance);
    if (!auth.authorized) return;

    try {
        const result = await PaymentSystem.resendOrderRewards(call.req.orderId, {
            adminId: auth.adminId,
            adminRole: auth.role!,
            adminName: auth.username,
        });
        if (!result.success) {
            call.error(result.error || '重发奖励失败');
            return;
        }
        call.succ({ success: true });
    } catch (error: any) {
        call.error(error.message);
    }
}
