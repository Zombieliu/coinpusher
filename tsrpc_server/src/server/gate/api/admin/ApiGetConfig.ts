import { ReqGetConfig, ResGetConfig } from "../../../../tsrpc/protocols/gate/admin/PtlGetConfig";

import { ApiCall } from "tsrpc";
import { MongoDBService } from "../../db/MongoDBService";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";
import { AdminPermission } from "../../bll/AdminUserSystem";



export async function ApiGetConfig(
    call: ApiCall<ReqGetConfig, ResGetConfig>
) {
    // 验证管理员权限
    const auth = await AdminAuthMiddleware.requirePermission(
        call,
        AdminPermission.ViewConfig
    );
    if (!auth.authorized) return;

    try {
        const { configType } = call.req;

        if (!configType) {
            call.error('configType is required');
            return;
        }

        // 从MongoDB获取配置
        const configCollection = MongoDBService.getCollection('game_configs');
        const configDoc = await configCollection.findOne({ configType });

        if (!configDoc) {
            // 返回默认配置
            const defaultConfig = getDefaultConfig(configType);
            call.succ({
                configType,
                config: defaultConfig,
                version: 1,
                lastUpdatedAt: Date.now(),
            });
            return;
        }

        call.succ({
            configType: configDoc.configType,
            config: configDoc.config,
            version: configDoc.version || 1,
            lastUpdatedAt: configDoc.lastUpdatedAt || Date.now(),
            lastUpdatedBy: configDoc.lastUpdatedBy,
        });

    } catch (error) {
        console.error('[ApiGetConfig] Error:', error);
        call.error('Internal server error');
    }
}

/**
 * 获取默认配置
 */
function getDefaultConfig(configType: string): any {
    const defaults: Record<string, any> = {
        game: {
            maxLevel: 60,
            expMultiplier: 1.0,
            goldMultiplier: 1.0,
            matchDuration: 600, // 10分钟
            maxPlayers: 10,
            enablePVP: true,
            enablePVE: true,
        },
        payment: {
            currency: 'CNY',
            minRecharge: 1,
            maxRecharge: 10000,
            firstRechargeBonus: 2.0,
            vipPrices: {
                1: 30,
                2: 98,
                3: 328,
                4: 648,
                5: 1998,
            },
        },
        match: {
            matchmakingTimeout: 30,
            minRankDifference: 200,
            maxRankDifference: 500,
            enableBots: true,
            botFillThreshold: 0.7,
        },
        shop: {
            refreshInterval: 86400, // 24小时
            freeRefreshTimes: 3,
            refreshCost: 50,
            discountRate: 0.8,
        },
        mail: {
            maxMailCount: 100,
            mailExpireDays: 7,
            attachmentExpireDays: 30,
        },
        signin: {
            resetHour: 0,
            rewards: [
                { day: 1, gold: 100, exp: 50 },
                { day: 2, gold: 200, exp: 100 },
                { day: 3, gold: 300, exp: 150 },
                { day: 4, gold: 400, exp: 200 },
                { day: 5, gold: 500, exp: 250 },
                { day: 6, gold: 600, exp: 300 },
                { day: 7, gold: 1000, exp: 500, tickets: 10 },
            ],
        },
    };

    return defaults[configType] || {};
}
