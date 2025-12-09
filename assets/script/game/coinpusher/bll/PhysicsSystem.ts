/**
 * @file PhysicsSystem.ts
 * @description 物理系统 - 处理物理组件的更新逻辑
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-12-04
 *
 * @description
 * 负责每帧更新物理组件：
 * - 插值渲染推板和金币
 * - 处理客户端预测
 * - 同步服务器快照
 */

import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
// Import component to ensure @ecs.register decorator runs
import { PhysicsComp } from "./PhysicsComp";

console.log("[DEBUG] PhysicsSystem.ts loaded, PhysicsComp imported");

/**
 * 物理系统
 * 负责每帧更新所有 PhysicsComp 组件
 */
export class PhysicsSystem extends ecs.ComblockSystem implements ecs.ISystemUpdate {
    constructor() {
        console.log("[DEBUG] PhysicsSystem constructor called");
        super();
    }

    /**
     * 每帧更新
     * @param entity 实体
     */
    update(entity: ecs.Entity): void {
        const physicsComp = entity.get(PhysicsComp);
        if (physicsComp) {
            physicsComp.update(this.dt);
        }
    }

    /**
     * 指定这个系统只处理拥有 PhysicsComp 的实体
     */
    filter(): ecs.IMatcher {
        return ecs.allOf(PhysicsComp);
    }
}
