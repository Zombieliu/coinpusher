import { MongoDBService } from "../db/MongoDBService";

export interface SystemConfig {
    key: string;
    value: any;
    updatedAt: number;
    updatedBy: string;
}

export interface MaintenanceConfig {
    enabled: boolean;
    reason: string;
    whitelistIps: string[];
    whitelistUsers: string[]; // 测试账号
    startTime?: number;
    endTime?: number;
}

export class SystemConfigSystem {
    
    static async getConfig<T>(key: string, defaultValue: T): Promise<T> {
        const collection = MongoDBService.getCollection<SystemConfig>('system_config');
        const doc = await collection.findOne({ key });
        return doc ? doc.value : defaultValue;
    }

    static async setConfig(key: string, value: any, operator: string): Promise<void> {
        const collection = MongoDBService.getCollection<SystemConfig>('system_config');
        await collection.updateOne(
            { key },
            {
                $set: {
                    value,
                    updatedAt: Date.now(),
                    updatedBy: operator
                }
            },
            { upsert: true }
        );
    }

    // ========== 维护模式快捷访问 ==========

    static async getMaintenanceConfig(): Promise<MaintenanceConfig> {
        return await this.getConfig<MaintenanceConfig>('maintenance_mode', {
            enabled: false,
            reason: '服务器维护中，请稍后重试',
            whitelistIps: [],
            whitelistUsers: []
        });
    }

    static async setMaintenanceConfig(config: MaintenanceConfig, operator: string): Promise<void> {
        await this.setConfig('maintenance_mode', config, operator);
    }

    /**
     * 检查是否允许登录 (用于登录接口)
     */
    static async checkMaintenanceAccess(userId: string, ip: string): Promise<{ allowed: boolean; message?: string }> {
        const config = await this.getMaintenanceConfig();
        
        if (!config.enabled) return { allowed: true };

        if (config.whitelistUsers.includes(userId) || config.whitelistIps.includes(ip)) {
            return { allowed: true };
        }

        return { allowed: false, message: config.reason };
    }
}
