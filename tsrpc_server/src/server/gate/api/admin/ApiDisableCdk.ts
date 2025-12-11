import { ApiCall } from "tsrpc";
import { ReqDisableCdk, ResDisableCdk } from "../../../../tsrpc/protocols/gate/admin/PtlDisableCdk";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { MongoDBService } from "../../db/MongoDBService";
import { CdkAdminSystem } from "../../bll/CdkAdminSystem";

export async function ApiDisableCdk(call: ApiCall<ReqDisableCdk, ResDisableCdk>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.EditConfig);
    if (!auth.authorized) return;

    try {
        const collection = MongoDBService.getCollection('cdk_codes');
        const { code, disableBatch } = call.req;

        let result;
        let batchIdForLog: string | undefined;

        if (disableBatch) {
            // 此时 code 应当被视为 batchId
            batchIdForLog = code;
            result = await collection.updateMany(
                { batchId: code },
                { $set: { active: false } }
            );
        } else {
            const doc = await collection.findOne({ code });
            if (!doc) {
                call.error('未找到可操作的CDK');
                return;
            }
            batchIdForLog = doc.batchId;
            result = await collection.updateOne(
                { code },
                { $set: { active: false } }
            );
        }

        if (result.modifiedCount === 0) {
            call.error('未找到可操作的CDK');
            return;
        }

        await CdkAdminSystem.logAction({
            action: disableBatch ? 'disable_batch' : 'disable_code',
            batchId: batchIdForLog || code,
            code: disableBatch ? undefined : code,
            adminId: auth.adminId!,
            adminName: auth.username || 'unknown',
            comment: call.req.reason,
            payload: { modifiedCount: result.modifiedCount }
        });

        call.succ({ success: true, affected: result.modifiedCount });
    } catch (e: any) {
        call.error(e.message);
    }
}
