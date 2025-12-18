import { ApiCall } from "tsrpc";
import { ReqDeleteScheduledJob, ResDeleteScheduledJob } from "../../../../tsrpc/protocols/gate/admin/PtlDeleteScheduledJob";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { ScheduledJobSystem } from "../../bll/ScheduledJobSystem";

export async function ApiDeleteScheduledJob(call: ApiCall<ReqDeleteScheduledJob, ResDeleteScheduledJob>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.SystemConfig);
    if (!auth.authorized) return;

    const { jobId } = call.req;
    if (!jobId) {
        call.succ({ success: false, message: 'jobId_required' });
        return;
    }

    const ok = await ScheduledJobSystem.delete(jobId);
    if (ok) {
        call.succ({ success: true });
    } else {
        call.succ({ success: false, message: 'not_found_or_running' });
    }
}
