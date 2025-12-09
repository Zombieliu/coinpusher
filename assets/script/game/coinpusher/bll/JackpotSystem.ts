/**
 * @file JackpotSystem.ts
 * @description 大奖系统 - 处理大奖组件的更新和生命周期
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-12-04
 *
 * @description
 * 负责管理大奖组件：
 * - 组件初始化
 * - 每帧更新大奖掉落
 * - 事件监听和清理
 */

import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { JackpotComp } from "./JackpotComp";

/**
 * 大奖系统
 * 负责管理所有 JackpotComp 组件的生命周期和更新
 */
export class JackpotSystem extends ecs.ComblockSystem implements ecs.IEntityEnterSystem, ecs.IEntityRemoveSystem, ecs.ISystemUpdate {
    constructor() {
        super();
    }

    /**
     * 当实体进入系统时（添加了 JackpotComp）
     * @param entity 实体
     */
    entityEnter(entity: ecs.Entity): void {
        const jackpotComp = entity.get(JackpotComp);
        if (jackpotComp) {
            jackpotComp.onInit();
        }
    }

    /**
     * 当实体离开系统时（移除了 JackpotComp）
     * @param entity 实体
     */
    entityRemove(entity: ecs.Entity): void {
        const jackpotComp = entity.get(JackpotComp);
        if (jackpotComp) {
            jackpotComp.onDestroy();
        }
    }

    /**
     * 每帧更新
     * @param entity 实体
     */
    update(entity: ecs.Entity): void {
        const jackpotComp = entity.get(JackpotComp);
        if (jackpotComp) {
            jackpotComp.update(this.dt);
        }
    }

    /**
     * 指定这个系统只处理拥有 JackpotComp 的实体
     */
    filter(): ecs.IMatcher {
        return ecs.allOf(JackpotComp);
    }
}
