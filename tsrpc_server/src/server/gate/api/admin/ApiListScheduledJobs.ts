import { ApiCall } from "tsrpc";
import { ReqListScheduledJobs, ResListScheduledJobs } from "../../../../tsrpc/protocols/gate/admin/PtlListScheduledJobs";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ScheduledJobSystem } from "../../bll/ScheduledJobSystem";

export async function ApiListScheduledJobs(call: ApiCall<ReqListScheduledJobs, ResListScheduledJobs>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.SystemConfig);
    if (!auth.authorized) return;

    const jobs = await ScheduledJobSystem.list(call.req.status);
    call.succ({
        jobs: jobs.map(j => ({
            jobId: j.jobId,
            type: j.type,
            runAt: j.runAt,
            status: j.status,
            createdBy: j.createdBy,
            createdAt: j.createdAt,
            note: j.note,
            lastError: j.lastError,
            executedAt: j.executedAt,
            retryCount: j.retryCount,
            maxRetries: j.maxRetries,
            retryDelay: j.retryDelay,
            logs: j.logs
        }))
    });
}
