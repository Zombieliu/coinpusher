import { ApiCall } from "tsrpc";
import { ReqReplyTicket, ResReplyTicket } from "../../../../tsrpc/protocols/gate/admin/PtlReplyTicket";
import { TicketSystem, TicketStatus } from "../../bll/TicketSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'admin/ReplyTicket';

export async function ApiReplyTicket(call: ApiCall<ReqReplyTicket, ResReplyTicket>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewUsers);
    if (!auth.authorized) return;

    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        await TicketSystem.replyTicket(
            call.req.ticketId,
            auth.adminId!,
            auth.username!,
            call.req.content
        );

        if (call.req.closeTicket) {
            await TicketSystem.updateStatus(call.req.ticketId, TicketStatus.Closed);
        }

        call.succ({ success: true });
        success = true;
    } catch (e: any) {
        recordApiError('POST', ENDPOINT, e?.message || 'ticket_reply_failed');
        call.error(e?.message || 'Failed to reply ticket');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
