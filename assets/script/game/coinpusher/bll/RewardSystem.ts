/**
 * @file RewardSystem.ts
 * @description 奖励系统 - 处理奖励组件的初始化和清理
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-12-04
 *
 * @description
 * 负责管理奖励组件的生命周期：
 * - 组件初始化
 * - 事件监听注册
 * - 组件销毁清理
 */

import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { RewardComp } from "./RewardComp";

/**
 * 奖励系统
 * 负责管理所有 RewardComp 组件的生命周期
 */
export class RewardSystem extends ecs.ComblockSystem implements ecs.IEntityEnterSystem, ecs.IEntityRemoveSystem {
    constructor() {
        super();
    }

    /**
     * 当实体进入系统时（添加了 RewardComp）
     * @param entity 实体
     */
    entityEnter(entity: ecs.Entity): void {
        const rewardComp = entity.get(RewardComp);
        if (rewardComp) {
            rewardComp.onInit();
        }
    }

    /**
     * 当实体离开系统时（移除了 RewardComp）
     * @param entity 实体
     */
    entityRemove(entity: ecs.Entity): void {
        const rewardComp = entity.get(RewardComp);
        if (rewardComp) {
            rewardComp.onDestroy();
        }
    }

    /**
     * 指定这个系统只处理拥有 RewardComp 的实体
     */
    filter(): ecs.IMatcher {
        return ecs.allOf(RewardComp);
    }
}
