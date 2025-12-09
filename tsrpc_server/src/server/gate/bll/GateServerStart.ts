/*
 * @Author: dgflash
 * @Date: 2022-06-22 18:32:20
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-12 17:34:57
 */
import chalk from "chalk";
import path from "path";
import { ecs } from "../../../core/ecs/ECS";
import { User } from "../../../module/account/bll/User";
import { CommonFactory } from "../../../module/common/CommonFactory";
import { MongoDB } from "../../../module/common/MongoDB";
import { ServerGate } from "../ServerGate";

/** 启动网关服务器 */
@ecs.register('GateServerStart')
export class GateServerStartComp extends ecs.Comp {
    reset(): void { }
}

export class GateServerStartSystem extends ecs.ComblockSystem implements ecs.IEntityEnterSystem {
    filter(): ecs.IMatcher {
        return ecs.allOf(GateServerStartComp);
    }

    async entityEnter(e: ServerGate) {
        let server = CommonFactory.createHsGate();
        e.GateModel.hsGate = server;

        // 如果指定 autoImplementApi 的第 2 个参数为 true，则开启延迟挂载，即延迟到对应接口被调用时才执行挂载操作，加快冷启动速度
        // 主API目录
        await server.autoImplementApi(path.resolve(__dirname, '../api'), true);
        server.logger.log(chalk.green(`[网关服务器] 服务已初始化完成`));

        // 连接数据库 - 必须在加载Admin APIs之前连接
        await MongoDB.init();
        server.logger.log(chalk.green(`[网关服务器] 数据库实始化完成`));

        // 初始化MongoDBService（用于Admin APIs）
        const { MongoDBService } = await import('../db/MongoDBService');
        const { Config } = await import('../../../module/config/Config');
        // 优先使用环境变量 MONGO_URI，如果没有则使用 Config.mongodb
        const mongoUri = process.env.MONGO_URI || `mongodb://${Config.mongodb}/`;
        const dbName = process.env.DB_NAME || 'coinpusher_game';
        await MongoDBService.connect(mongoUri, dbName);
        server.logger.log(chalk.green(`[MongoDBService] 已连接`));

        // Admin API目录 - 在数据库连接后加载
        const adminApiPath = path.resolve(__dirname, '../api/admin');
        server.logger.log(`正在加载Admin APIs: ${adminApiPath}`);

        // 使用glob模式手动加载admin目录下的所有API
        const fs = require('fs');
        // 在生产环境中是 .js 文件，开发环境是 .ts 文件
        const isProduction = process.env.NODE_ENV === 'production';
        const fileExtension = isProduction ? '.js' : '.ts';
        const adminFiles = fs.readdirSync(adminApiPath).filter((f: string) => f.startsWith('Api') && f.endsWith(fileExtension));
        server.logger.log(`发现 ${adminFiles.length} 个Admin API文件 (${fileExtension})`);

        let loadedCount = 0;
        let failedCount = 0;

        for (const file of adminFiles) {
            const apiName = file.replace(fileExtension, '').replace('Api', '');
            const apiPath = `admin/${apiName}`;
            const modulePath = path.join(adminApiPath, file);

            try {
                // 尝试加载API模块
                const apiModule = require(modulePath);
                const apiFunc = apiModule[`Api${apiName}`];
                if (apiFunc && typeof apiFunc === 'function') {
                    server.implementApi(apiPath as any, apiFunc);
                    loadedCount++;
                    // 只记录成功的API到日志
                    if (loadedCount <= 3 || apiPath === 'admin/AdminLogin') {
                        server.logger.log(`  ✓ ${apiPath}`);
                    }
                } else {
                    failedCount++;
                }
            } catch (err: any) {
                failedCount++;
                // TypeScript编译错误不影响其他API，仅记录到日志
                if (err.message && !err.message.includes('Unable to compile TypeScript')) {
                    server.logger.error(`  ✗ ${apiPath}: ${err.message}`);
                }
            }
        }

        server.logger.log(chalk.green(`Admin APIs: ${loadedCount} 加载成功, ${failedCount} 跳过`));

        // 初始化管理员系统
        const { AdminUserSystem } = await import('./AdminUserSystem');
        await AdminUserSystem.initialize();
        server.logger.log(chalk.green(`[管理员系统] 已初始化`));

        // 初始化审计日志系统
        const { AuditLogSystem } = await import('./AuditLogSystem');
        await AuditLogSystem.initialize(MongoDBService.getDb());
        server.logger.log(chalk.green(`[审计日志系统] 已初始化`));

        // 初始化监控系统
        const { MonitoringSystem } = await import('./MonitoringSystem');
        await MonitoringSystem.initialize(MongoDBService.getDb());
        server.logger.log(chalk.green(`[监控系统] 已初始化`));

        // 启动匹配服务器
        await server.start();
        server.logger.log(chalk.green(`[网关服务器] 成功启动`));

        // 用户数据表
        User.init();
    }
}