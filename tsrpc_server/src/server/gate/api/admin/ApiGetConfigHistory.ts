import { ReqGetConfigHistory, ResGetConfigHistory } from "../../../../tsrpc/protocols/gate/admin/PtlGetConfigHistory";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";



export async function ApiGetConfigHistory(
    call: ApiCall<ReqGetConfigHistory, ResGetConfigHistory>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ViewConfig
    );
    if (!auth.authorized) return;

    try {
        const { configType, page = 1, limit = 20 } = call.req;
        const skip = (page - 1) * limit;

        const historyCollection = MongoDBService.getCollection('config_history');

        const history = await historyCollection
            .find({ configType })
            .sort({ savedAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await historyCollection.countDocuments({ configType });

        call.succ({
            history: history.map(h => ({
                historyId: h._id?.toString() || '',
                version: h.version,
                config: h.config,
                updatedAt: h.savedAt ?? h.updatedAt ?? Date.now(),
                updatedBy: h.savedBy ?? h.updatedBy ?? 'unknown',
                comment: h.comment || '',
            })),
            total,
            page,
            limit,
        });

    } catch (error) {
        console.error('[ApiGetConfigHistory] Error:', error);
        call.error('Internal server error');
    }
}
