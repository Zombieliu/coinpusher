/**
 * @file CoinPusherSystem.ts
 * @description 推金币游戏主系统
 *
 * @module coinpusher
 *
 * @author OOPS Framework
 * @created 2025-12-04
 *
 * @description
 * 整合所有推金币相关的子系统：
 * - PhysicsSystem: 物理更新系统
 * - RewardSystem: 奖励管理系统
 * - JackpotSystem: 大奖管理系统
 *
 * 这个系统遵循 ECS 架构的最佳实践，将逻辑分离到独立的 System 中
 */

import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { PhysicsSystem } from "./bll/PhysicsSystem";
import { RewardSystem } from "./bll/RewardSystem";
import { JackpotSystem } from "./bll/JackpotSystem";

/**
 * 推金币游戏主系统
 *
 * @description
 * 聚合所有推金币相关的子系统，统一管理游戏逻辑
 */
export class EcsCoinPusherSystem extends ecs.System {
    constructor() {
        super();

        console.log('[EcsCoinPusherSystem] Initializing CoinPusher systems...');

        // 添加子系统（按照依赖顺序）
        this.add(new PhysicsSystem());   // 物理系统（负责渲染更新）
        this.add(new RewardSystem());    // 奖励系统（负责金币收集）
        this.add(new JackpotSystem());   // 大奖系统（负责大奖掉落）

        console.log('[EcsCoinPusherSystem] CoinPusher systems initialized');
    }
}
