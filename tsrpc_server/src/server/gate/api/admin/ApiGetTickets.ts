import { ApiCall } from "tsrpc";
import { ReqGetTickets, ResGetTickets } from "../../../../tsrpc/protocols/gate/admin/PtlGetTickets";
import { TicketSystem } from "../../bll/TicketSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'admin/GetTickets';

export async function ApiGetTickets(call: ApiCall<ReqGetTickets, ResGetTickets>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewUsers);
    if (!auth.authorized) return;

    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        const result = await TicketSystem.getTickets({
            userId: call.req.userId,
            status: call.req.status,
            type: call.req.type,
            page: call.req.page,
            limit: call.req.limit
        });

        call.succ({
            success: true,
            tickets: result.tickets,
            total: result.total
        });
        success = true;
    } catch (e: any) {
        recordApiError('POST', ENDPOINT, e?.message || 'ticket_query_failed');
        call.error(e?.message || 'Failed to load tickets');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
