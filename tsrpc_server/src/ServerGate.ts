/*
 * @Author: dgflash
 * @Date: 2022-06-22 18:37:06
 * @LastEditors: dgflash
 * @LastEditTime: 2022-11-14 16:43:57
 */
import { ecs } from "./core/ecs/ECS";
import { CommonUtil } from "./module/common/CommonUtil";
import { dev } from "./module/config/Config";
import { ServerGate } from "./server/gate/ServerGate";
import { ServerGateSystem } from "./server/gate/ServerGateSystem";
import { UserDB } from "./server/gate/data/UserDB"; // 导入 UserDB
import { MonitoringServer } from "./server/utils/MonitoringServer";
import { MetricsCollector } from "./server/utils/MetricsCollector";
import { FinanceHealthMonitor } from "./server/utils/FinanceHealthMonitor";

/** 网关服务器对象 */
export var sg: ServerGate = null!

async function main() { // main 函数改为异步
    dev();

    // 初始化 MongoDB 连接
    // 优先使用环境变量，其次尝试 docker compose 的 host name，最后回退到 localhost
    const mongoUri = process.env.MONGO_URI || "mongodb://mongodb:27017";

    try {
        await UserDB.init(
            mongoUri,
            process.env.DB_NAME || "coin_pusher",
            process.env.COLLECTION_NAME || "users"
        );
    } catch (e) {
        console.error('[ServerGate] Failed to init UserDB, trying localhost fallback...');
        await UserDB.init(
            "mongodb://127.0.0.1:27017",
            process.env.DB_NAME || "coin_pusher",
            process.env.COLLECTION_NAME || "users"
        );
    }

    CommonUtil.init(new ServerGateSystem());

    sg = ecs.getEntity<ServerGate>(ServerGate);
    sg.start();

    MetricsCollector.init();
    const monitoringPort = Number(process.env.MONITORING_PORT || 9090);
    MonitoringServer.start(monitoringPort);
    FinanceHealthMonitor.start();
}

main();
