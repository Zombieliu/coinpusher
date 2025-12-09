import { ApiCall } from "tsrpc";
import { ReqGenerateCdk, ResGenerateCdk } from "../../../../tsrpc/protocols/gate/admin/PtlGenerateCdk";
import { CdkSystem } from "../../bll/CdkSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import crypto from 'crypto';

export async function ApiGenerateCdk(call: ApiCall<ReqGenerateCdk, ResGenerateCdk>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.EditConfig);
    if (!auth.authorized) return;

    try {
        const batchId = crypto.randomUUID();
        const codes = await CdkSystem.generateCdk({
            batchId,
            name: call.req.name,
            type: call.req.type,
            rewards: call.req.rewards,
            count: call.req.count,
            usageLimit: call.req.usageLimit,
            prefix: call.req.prefix,
            expireAt: call.req.expireAt,
            createdBy: auth.adminId!
        });

        call.succ({
            success: true,
            batchId,
            codes: codes.length <= 100 ? codes : undefined // 数量太多不直接返回
        });
    } catch (e: any) {
        call.error(e.message);
    }
}
