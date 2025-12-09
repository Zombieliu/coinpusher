import { ReqUpdateConfig, ResUpdateConfig } from "../../../../tsrpc/protocols/gate/admin/PtlUpdateConfig";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission, AdminUserSystem } from "../../bll/AdminUserSystem";



export async function ApiUpdateConfig(
    call: ApiCall<ReqUpdateConfig, ResUpdateConfig>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.EditConfig
    );
    if (!auth.authorized) return;

    try {
        const { configType, config, comment } = call.req;

        if (!configType || !config) {
            call.error('configType and config are required');
            return;
        }

        // 验证配置格式
        const validation = validateConfig(configType, config);
        if (!validation.valid) {
            call.succ({
                success: false,
                version: 0,
                message: validation.error,
            });
            return;
        }

        const configCollection = MongoDBService.getCollection('game_configs');
        const now = Date.now();

        // 获取当前配置以保存历史版本
        const currentConfig = await configCollection.findOne({ configType });

        if (currentConfig) {
            // 保存历史版本
            const historyCollection = MongoDBService.getCollection('config_history');
            await historyCollection.insertOne({
                configType,
                config: currentConfig.config,
                version: currentConfig.version,
                savedAt: now,
                savedBy: auth.adminId,
                comment: comment || '配置更新',
            });
        }

        // 更新配置
        const newVersion = (currentConfig?.version || 0) + 1;
        const result = await configCollection.updateOne(
            { configType },
            {
                $set: {
                    configType,
                    config,
                    version: newVersion,
                    lastUpdatedAt: now,
                    lastUpdatedBy: auth.username,
                },
            },
            { upsert: true }
        );

        // 记录操作日志
        await AdminUserSystem.logAdminAction(auth.adminId!, 'update_config', {
            configType,
            version: newVersion,
            comment,
            timestamp: now,
        });

        call.succ({
            success: true,
            version: newVersion,
            message: '配置更新成功',
        });

    } catch (error) {
        console.error('[ApiUpdateConfig] Error:', error);
        call.error('Internal server error');
    }
}

/**
 * 验证配置格式
 */
function validateConfig(configType: string, config: any): { valid: boolean; error?: string } {
    // 基础验证
    if (typeof config !== 'object') {
        return { valid: false, error: '配置必须是对象类型' };
    }

    // 特定类型验证
    switch (configType) {
        case 'game':
            if (config.maxLevel && (config.maxLevel < 1 || config.maxLevel > 999)) {
                return { valid: false, error: 'maxLevel必须在1-999之间' };
            }
            if (config.matchDuration && (config.matchDuration < 60 || config.matchDuration > 3600)) {
                return { valid: false, error: 'matchDuration必须在60-3600秒之间' };
            }
            break;

        case 'payment':
            if (config.minRecharge && config.minRecharge < 0) {
                return { valid: false, error: 'minRecharge不能为负数' };
            }
            if (config.maxRecharge && config.maxRecharge < config.minRecharge) {
                return { valid: false, error: 'maxRecharge必须大于minRecharge' };
            }
            break;

        case 'match':
            if (config.matchmakingTimeout && (config.matchmakingTimeout < 5 || config.matchmakingTimeout > 300)) {
                return { valid: false, error: 'matchmakingTimeout必须在5-300秒之间' };
            }
            break;

        case 'shop':
            if (config.refreshInterval && config.refreshInterval < 3600) {
                return { valid: false, error: 'refreshInterval不能小于3600秒(1小时)' };
            }
            break;

        case 'signin':
            if (config.rewards) {
                if (!Array.isArray(config.rewards)) {
                    return { valid: false, error: 'signin.rewards必须是数组' };
                }
                for (let i = 0; i < config.rewards.length; i++) {
                    const reward = config.rewards[i];
                    if (!reward.day || !reward.gold) {
                        return { valid: false, error: `rewards[${i}]缺少必需字段day或gold` };
                    }
                }
            }
            break;
    }

    return { valid: true };
}
