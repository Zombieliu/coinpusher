import { ApiCall } from "tsrpc";
import { ReqGetScheduledJobLogs, ResGetScheduledJobLogs } from "../../../../tsrpc/protocols/gate/admin/PtlGetScheduledJobLogs";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { MongoDBService } from "../../bll/MongoDBService";
import { ScheduledJob } from "../../bll/ScheduledJobSystem";

export async function ApiGetScheduledJobLogs(call: ApiCall<ReqGetScheduledJobLogs, ResGetScheduledJobLogs>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.SystemConfig);
    if (!auth.authorized) return;

    const { jobId, page = 1, limit = 20 } = call.req;
    if (!jobId) {
        call.succ({ logs: [], total: 0 });
        return;
    }

    const col = MongoDBService.getCollection<ScheduledJob>('scheduled_jobs');
    const job = await col.findOne({ jobId }, { projection: { logs: 1 } });
    if (!job?.logs || job.logs.length === 0) {
        call.succ({ logs: [], total: 0 });
        return;
    }

    const start = Math.max(0, (page - 1) * limit);
    const sliced = job.logs.slice(start, start + limit);
    call.succ({
        logs: sliced,
        total: job.logs.length
    });
}
