/**
 * @file EffectComp.ts
 * @description 特效管理组件
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-12-05
 *
 * @description
 * 基于 OOPS Framework 的 EffectSingleCase 封装的特效管理组件
 * 提供统一的特效播放接口，支持：
 * - 粒子特效（ParticleSystem）
 * - 动画特效（Animation）
 * - Spine 动画
 */

import { Node, Vec3 } from "cc";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { EffectSingleCase } from "../../../../../extensions/oops-plugin-framework/assets/libs/animator-effect/EffectSingleCase";
import { GameViewComp } from "../view/GameViewComp";

@ecs.register("EffectComp")
export class EffectComp extends ecs.Comp {
    /** 特效父节点 */
    private effectParent: Node | null = null;

    /** OOPS 特效管理器实例 */
    private effectManager = EffectSingleCase.instance;

    // ========== 生命周期 ==========

    onInit() {
        console.log("[EffectComp] Effect component initialized");

        // 从 GameViewComp 获取特效父节点
        const gameView = this.ent.get(GameViewComp);
        if (gameView) {
            this.effectParent = gameView.effectParent;

            if (this.effectParent) {
                console.log("[EffectComp] Effect parent node found:", this.effectParent.name);
                console.log("[EffectComp] Effect parent children count:", this.effectParent.children.length);

                // 列出所有子节点
                this.effectParent.children.forEach((child, index) => {
                    console.log(`[EffectComp] Child ${index}: ${child.name}`);
                });
            } else {
                console.error("[EffectComp] Effect parent node is NULL!");
            }
        } else {
            console.error("[EffectComp] GameViewComp not found!");
        }

        if (!this.effectParent) {
            console.warn("[EffectComp] Effect parent node not found, effects will be played in world space");
        }
    }

    // ========== 特效播放接口 ==========

    /**
     * 播放庆祝特效（大奖）
     * @param position 播放位置（世界坐标）
     * @param callback 播放完成回调
     */
    async playCelebrate(position?: Vec3, callback?: () => void) {
        console.log("[EffectComp] Playing celebrate effect");

        const parent = this.effectParent || this.ent.node;
        if (!parent) {
            console.error("[EffectComp] No parent node for effect");
            return;
        }

        try {
            await this.effectManager.loadAndShow(
                "effect/prefab/celebrate",
                parent,
                {
                    worldPos: position,
                    isPlayFinishedRelease: true,
                    bundleName: "resources"
                }
            );

            // 庆祝特效持续 3 秒
            setTimeout(() => {
                callback?.();
            }, 3000);
        } catch (error) {
            console.error("[EffectComp] Failed to play celebrate effect:", error);
        }
    }

    /**
     * 播放金币掉落特效
     * @param position 播放位置（世界坐标）
     */
    async playCoinDrop(position: Vec3) {
        const parent = this.effectParent || this.ent.node;
        if (!parent) return;

        try {
            await this.effectManager.loadAndShow(
                "effect/prefab/propSynthesis",
                parent,
                {
                    worldPos: position,
                    isPlayFinishedRelease: true,
                    bundleName: "resources"
                }
            );
        } catch (error) {
            console.error("[EffectComp] Failed to play coin drop effect:", error);
        }
    }

    /**
     * 播放机器待机动画
     */
    async playMachineIdle() {
        const parent = this.effectParent || this.ent.node;
        if (!parent) return;

        console.log("[EffectComp] Playing machine idle animation");

        const machineParts = ["machineTop", "machineBottom", "machineLight", "machineClown"];

        for (const partName of machineParts) {
            try {
                await this.effectManager.loadAndShow(
                    `effect/prefab/${partName}`,
                    parent,
                    {
                        bundleName: "resources"
                    }
                );
            } catch (error) {
                console.warn(`[EffectComp] Failed to play ${partName}:`, error);
            }
        }
    }

    /**
     * 播放通用粒子特效
     * @param path 特效预制体路径（相对于 resources）
     * @param position 播放位置（世界坐标）
     * @param scale 缩放比例
     * @param autoRecycle 是否自动回收
     * @param callback 播放完成回调
     */
    async playParticle(
        path: string,
        position: Vec3,
        scale: number = 1,
        autoRecycle: boolean = true,
        callback?: () => void
    ) {
        const parent = this.effectParent || this.ent.node;
        if (!parent) {
            console.error("[EffectComp] No parent node for effect");
            return;
        }

        try {
            const effectNode = await this.effectManager.loadAndShow(
                path,
                parent,
                {
                    worldPos: position,
                    isPlayFinishedRelease: autoRecycle,
                    bundleName: "resources"
                }
            );

            if (scale !== 1 && effectNode) {
                effectNode.setScale(new Vec3(scale, scale, scale));
            }

            if (callback) {
                // 假设粒子特效播放时长为 2 秒（可以根据实际情况调整）
                setTimeout(() => {
                    callback();
                }, 2000);
            }
        } catch (error) {
            console.error(`[EffectComp] Failed to play particle effect ${path}:`, error);
        }
    }

    /**
     * 播放特效到指定节点
     * @param path 特效预制体路径
     * @param targetNode 目标节点
     * @param localPos 本地坐标
     * @param autoRecycle 是否自动回收
     */
    async playEffectOnNode(
        path: string,
        targetNode: Node,
        localPos: Vec3 = new Vec3(),
        autoRecycle: boolean = true
    ) {
        try {
            const effectNode = await this.effectManager.loadAndShow(
                path,
                targetNode,
                {
                    pos: localPos,
                    isPlayFinishedRelease: autoRecycle,
                    bundleName: "resources"
                }
            );

            return effectNode;
        } catch (error) {
            console.error(`[EffectComp] Failed to play effect on node ${path}:`, error);
            return null;
        }
    }

    /**
     * 预加载特效
     * @param paths 特效路径数组
     * @param count 每个特效预加载数量
     */
    async preloadEffects(paths: string[], count: number = 3) {
        console.log(`[EffectComp] Preloading ${paths.length} effects...`);

        const promises = paths.map(path =>
            this.effectManager.preload(count, path, "resources")
        );

        try {
            await Promise.all(promises);
            console.log("[EffectComp] All effects preloaded");
        } catch (error) {
            console.error("[EffectComp] Failed to preload effects:", error);
        }
    }

    /**
     * 清理特效池
     * @param path 特效路径，不传则清理所有
     */
    clearEffects(path?: string) {
        if (path) {
            this.effectManager.clear(path);
            console.log(`[EffectComp] Cleared effect pool: ${path}`);
        } else {
            this.effectManager.clear();
            console.log("[EffectComp] Cleared all effect pools");
        }
    }

    /**
     * 释放特效资源
     * @param path 特效路径，不传则释放所有
     */
    releaseEffects(path?: string) {
        if (path) {
            this.effectManager.release(path);
            console.log(`[EffectComp] Released effect: ${path}`);
        } else {
            this.effectManager.release();
            console.log("[EffectComp] Released all effects");
        }
    }

    // ========== 清理 ==========

    onDestroy() {
        console.log("[EffectComp] Component destroyed");
        // 不释放资源，因为 EffectSingleCase 是全局单例
        this.effectParent = null;
    }
}
