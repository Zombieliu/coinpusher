import { ApiCall } from "tsrpc";
import { ReqGetFinancialStats, ResGetFinancialStats } from "../../../../tsrpc/protocols/gate/admin/PtlGetFinancialStats";
import { PaymentSystem } from "../../bll/PaymentSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetFinancialStats(call: ApiCall<ReqGetFinancialStats, ResGetFinancialStats>) {
    // 权限检查
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewFinance);
    if (!auth.authorized) return;

    try {
        const stats = await PaymentSystem.getFinancialStatsDetailed(
            call.req.startDate,
            call.req.endDate
        );

        call.succ({
            success: true,
            ...stats
        });
    } catch (e: any) {
        call.error(e.message);
    }
}
