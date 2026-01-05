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
        const { DragonflyDBService } = await import('../db/DragonflyDBService');
        const { Config } = await import('../../../module/config/Config');
        const { PaymentSystem } = await import('./PaymentSystem');
        // 校验关键配置
        PaymentSystem.validateStripeConfig();
        // 优先使用环境变量 MONGO_URI，如果没有则使用 Config.mongodb
        const mongoUri = process.env.MONGO_URI || `mongodb://${Config.mongodb}/`;
        const dbName = process.env.DB_NAME || 'coinpusher_game';
        await MongoDBService.connect(mongoUri, dbName);
        server.logger.log(chalk.green(`[MongoDBService] 已连接`));

        // 连接 DragonflyDB/Redis（如果配置了 URL）
        const dragonflyUrl = process.env.DRAGONFLY_URL;
        if (dragonflyUrl) {
            try {
                await DragonflyDBService.connect(dragonflyUrl);
                server.logger.log(chalk.green(`[DragonflyDB] 已连接`));
            } catch (err: any) {
                server.logger.error(`[DragonflyDB] 连接失败: ${err?.message || err}`);
            }
        } else {
            server.logger.log(`[DragonflyDB] 未配置 DRAGONFLY_URL，跳过连接`);
        }

        // Admin API目录 - 在数据库连接后加载
        const adminApiPath = path.resolve(__dirname, '../api/admin');
        server.logger.log(`正在加载Admin APIs: ${adminApiPath}`);

        // 递归扫描 admin 目录，支持子目录
        const fs = require('fs');
        const isProduction = process.env.NODE_ENV === 'production';
        const fileExtension = isProduction ? '.js' : '.ts';

        function collectApiFiles(dir: string, acc: string[] = []) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const ent of entries) {
                const full = path.join(dir, ent.name);
                if (ent.isDirectory()) {
                    collectApiFiles(full, acc);
                } else if (
                    ent.isFile() &&
                    ent.name.startsWith('Api') &&
                    ent.name.endsWith(fileExtension) &&
                    !ent.name.toLowerCase().includes('.example')
                ) {
                    acc.push(full);
                }
            }
            return acc;
        }

        const adminFiles: string[] = collectApiFiles(adminApiPath);
        server.logger.log(`发现 ${adminFiles.length} 个Admin API文件 (${fileExtension})`);

        let loadedCount = 0;
        let failedCount = 0;
        let compileFailCount = 0;
        let namingWarnCount = 0;

        for (const filePath of adminFiles) {
            const rel = path.relative(adminApiPath, filePath);
            const parsed = path.parse(rel);
            const apiNameRaw = parsed.name;
            const apiName = apiNameRaw.replace(/^Api/, '');
            const apiPath = `admin/${parsed.dir ? parsed.dir.replace(/\\/g, '/') + '/' : ''}${apiName}`;

            // 命名校验：文件应以 Api 开头且后续为 PascalCase
            if (!/^Api[A-Z][A-Za-z0-9]+$/.test(apiNameRaw)) {
                namingWarnCount++;
                server.logger.warn(`  ⚠️ 命名不规范，期望 ApiPascalCase: ${rel}`);
            }

            try {
                const apiModule = require(filePath);
                const exportName = `Api${apiName}`;
                const apiFunc = apiModule[exportName];
                if (apiFunc && typeof apiFunc === 'function') {
                    server.implementApi(apiPath as any, apiFunc);
                    loadedCount++;
                    server.logger.log(`  ✓ ${apiPath}`);
                } else {
                    failedCount++;
                    server.logger.warn(`  ⚠️ 未找到导出函数 ${exportName} 于 ${apiPath}`);
                }
            } catch (err: any) {
                failedCount++;
                const msg = err?.message || String(err);
                if (msg.includes('Unable to compile TypeScript')) {
                    compileFailCount++;
                    server.logger.error(`  ✗ ${apiPath}: TS 编译失败 (${msg.split('\\n')[0]})`);
                } else {
                    server.logger.error(`  ✗ ${apiPath}: ${msg}`);
                }
            }
        }

        server.logger.log(chalk.green(`Admin APIs: ${loadedCount} 加载成功, ${failedCount} 跳过, ${compileFailCount} TS编译失败, ${namingWarnCount} 命名警告`));

        // 初始化管理员系统
        const { AdminUserSystem } = await import('./AdminUserSystem');
        await AdminUserSystem.initialize();
        server.logger.log(chalk.green(`[管理员系统] 已初始化`));

        // 初始化审计日志系统
        const { AuditLogSystem } = await import('./AuditLogSystem');
        await AuditLogSystem.initialize(MongoDBService.getDb());
        server.logger.log(chalk.green(`[审计日志系统] 已初始化`));

        // 建索引（社交/任务/成就）
        const { SocialSystem } = await import('./SocialSystem');
        const { TaskSystem } = await import('./TaskSystem');
        const { AchievementSystem } = await import('./AchievementSystem');
        const { LeaderboardSystemV2 } = await import('./LeaderboardSystemV2');
        LeaderboardSystemV2.loadRewardConfig();
        await SocialSystem.ensureIndexes();
        await TaskSystem.ensureIndexes();
        await AchievementSystem.ensureIndexes();
        await LeaderboardSystemV2.ensureIndexes();
        server.logger.log(chalk.green(`[索引] Social/Task/Achievement/Leaderboard 索引检查完成`));

        // 初始化监控系统
        const { MonitoringSystem } = await import('./MonitoringSystem');
        await MonitoringSystem.initialize(MongoDBService.getDb());
        server.logger.log(chalk.green(`[监控系统] 已初始化`));

        // 启动调度任务
        const { ScheduledJobSystem } = await import('./ScheduledJobSystem');
        ScheduledJobSystem.start();
        server.logger.log(chalk.green(`[调度系统] 已启动`));

        // 启动匹配服务器
        await server.start();
        server.logger.log(chalk.green(`[网关服务器] 成功启动`));

        // 用户数据表
        User.init();
    }
}
