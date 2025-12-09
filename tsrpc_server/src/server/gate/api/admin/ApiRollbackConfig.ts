import { ReqRollbackConfig, ResRollbackConfig } from "../../../../tsrpc/protocols/gate/admin/PtlRollbackConfig";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminUserSystem } from "../../bll/AdminUserSystem";



export async function ApiRollbackConfig(
    call: ApiCall<ReqRollbackConfig, ResRollbackConfig>
) {
    // 验证管理员权限 - 需要编辑权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.EditConfig
    );
    if (!auth.authorized) return;

    try {
        const { configType, historyId } = call.req;

        if (!configType || !historyId) {
            call.error('configType and historyId are required');
            return;
        }

        const historyCollection = MongoDBService.getCollection('config_history');
        const configCollection = MongoDBService.getCollection('game_configs');

        // 获取历史配置
        const { ObjectId } = require('mongodb');
        const historyDoc = await historyCollection.findOne({
            _id: new ObjectId(historyId),
            configType,
        });

        if (!historyDoc) {
            call.succ({
                success: false,
                version: 0,
                message: '历史配置不存在',
            });
            return;
        }

        // 保存当前配置到历史
        const currentConfig = await configCollection.findOne({ configType });
        if (currentConfig) {
            await historyCollection.insertOne({
                configType,
                config: currentConfig.config,
                version: currentConfig.version,
                savedAt: Date.now(),
                savedBy: auth.adminId,
                comment: `回滚前的配置 (v${currentConfig.version})`,
            });
        }

        // 回滚配置
        const newVersion = (currentConfig?.version || 0) + 1;
        await configCollection.updateOne(
            { configType },
            {
                $set: {
                    configType,
                    config: historyDoc.config,
                    version: newVersion,
                    lastUpdatedAt: Date.now(),
                    lastUpdatedBy: auth.username,
                    rollbackFrom: historyDoc.version,
                },
            },
            { upsert: true }
        );

        // 记录操作日志
        await AdminUserSystem.logAdminAction(auth.adminId!, 'rollback_config', {
            configType,
            fromVersion: historyDoc.version,
            toVersion: newVersion,
            timestamp: Date.now(),
        });

        call.succ({
            success: true,
            version: newVersion,
            message: `成功回滚到版本 ${historyDoc.version}`,
        });

    } catch (error) {
        console.error('[ApiRollbackConfig] Error:', error);
        call.error('Internal server error');
    }
}
