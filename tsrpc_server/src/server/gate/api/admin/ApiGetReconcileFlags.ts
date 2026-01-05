import { ApiCall } from "tsrpc";
import { ReqGetReconcileFlags, ResGetReconcileFlags } from "../../../../tsrpc/protocols/gate/admin/PtlGetReconcileFlags";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";
import { MongoDBService } from "../../db/MongoDBService";
import { ObjectId } from "mongodb";

export async function ApiGetReconcileFlags(call: ApiCall<ReqGetReconcileFlags, ResGetReconcileFlags>) {
    const auth = await AdminAuthMiddleware.requirePermission(call, AdminPermission.ViewFinance);
    if (!auth.authorized) return;

    try {
        const page = Math.max(1, call.req.page || 1);
        const limit = Math.min(100, call.req.limit || 20);
        const collection = MongoDBService.getCollection('payment_reconcile_flags');

        const query: any = {};
        if (call.req.type) query.type = call.req.type;
        if (typeof call.req.resolved === 'boolean') query.resolved = call.req.resolved;

        const total = await collection.countDocuments(query);
        const flags = await collection.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        call.succ({
            success: true,
            flags: flags.map(f => ({
                ...f,
                _id: (f._id as ObjectId).toString()
            })),
            total
        });
    } catch (err: any) {
        call.succ({ success: false, error: err?.message || '查询失败' });
    }
}
