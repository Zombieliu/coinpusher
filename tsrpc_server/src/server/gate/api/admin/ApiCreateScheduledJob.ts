import { ApiCall } from "tsrpc";
import { ReqCreateScheduledJob, ResCreateScheduledJob } from "../../../../tsrpc/protocols/gate/admin/PtlCreateScheduledJob";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ScheduledJobSystem } from "../../bll/ScheduledJobSystem";

export async function ApiCreateScheduledJob(call: ApiCall<ReqCreateScheduledJob, ResCreateScheduledJob>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.SystemConfig);
    if (!auth.authorized) return;

    const { type, runAt, payload, note, maxRetries, retryDelay } = call.req;
    if (!type || !runAt || !payload) {
        call.succ({ success: false, message: 'invalid_params' });
        return;
    }
    if (runAt < Date.now()) {
        call.succ({ success: false, message: 'runAt_in_past' });
        return;
    }

    const normalizedMaxRetries = typeof maxRetries === 'number' && maxRetries >= 0 ? Math.floor(maxRetries) : undefined;
    const normalizedRetryDelay = typeof retryDelay === 'number' && retryDelay > 0 ? retryDelay : undefined;

    const jobId = await ScheduledJobSystem.schedule({
        type: type as any,
        runAt,
        payload,
        note,
        createdBy: auth.adminId,
        maxRetries: normalizedMaxRetries,
        retryDelay: normalizedRetryDelay
    });

    call.succ({ success: true, jobId });
}
