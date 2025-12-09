import { ApiCall } from "tsrpc";
import { ReqGetCdkList, ResGetCdkList } from "../../../../tsrpc/protocols/gate/admin/PtlGetCdkList";
import { CdkSystem } from "../../bll/CdkSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";

export async function ApiGetCdkList(call: ApiCall<ReqGetCdkList, ResGetCdkList>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewConfig);
    if (!auth.authorized) return;

    try {
        const result = await CdkSystem.getCdkList({
            batchId: call.req.batchId,
            code: call.req.code,
            type: call.req.type,
            active: call.req.active,
            page: call.req.page,
            limit: call.req.limit
        });

        call.succ({
            success: true,
            list: result.list,
            total: result.total
        });
    } catch (e: any) {
        call.error(e.message);
    }
}
