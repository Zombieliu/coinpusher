import { ApiCall } from "tsrpc";
import { ReqDisableCdk, ResDisableCdk } from "../../../../tsrpc/protocols/gate/admin/PtlDisableCdk";
import { CdkSystem } from "../../bll/CdkSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { MongoDBService } from "../../db/MongoDBService";

export async function ApiDisableCdk(call: ApiCall<ReqDisableCdk, ResDisableCdk>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.EditConfig);
    if (!auth.authorized) return;

    try {
        const collection = MongoDBService.getCollection('cdk_codes');
        const { code, disableBatch } = call.req;

        let result;
        if (disableBatch) {
            // 此时 code 应当被视为 batchId
            result = await collection.updateMany(
                { batchId: code },
                { $set: { active: false } }
            );
        } else {
            result = await collection.updateOne(
                { code },
                { $set: { active: false } }
            );
        }

        if (result.modifiedCount === 0) {
            call.error('未找到可操作的CDK');
            return;
        }

        call.succ({ success: true });
    } catch (e: any) {
        call.error(e.message);
    }
}
