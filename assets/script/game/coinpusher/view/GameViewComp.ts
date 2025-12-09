/**
 * @file GameViewComp.ts
 * @description 游戏场景视图组件
 *
 * @module coinpusher/view
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 管理游戏场景的节点引用：
 * - 场景根节点
 * - 推动台节点
 * - 金币父节点
 * - 触摸平面节点
 * - 摄像机节点
 */

import { Node, Camera, Animation, Component, Prefab } from "cc";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { PhysicsComp } from "../bll/PhysicsComp";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";

@ecs.register("GameView")
export class GameViewComp extends ecs.Comp {
    // ========== 场景节点引用 ==========
    /** 游戏场景根节点 */
    sceneRoot: Node | null = null;

    /** 推动台节点 */
    pushNode: Node | null = null;

    /** 金币父节点 */
    coinParent: Node | null = null;

    /** 触摸平面节点 */
    touchPlane: Node | null = null;

    /** 摄像机节点 */
    cameraNode: Node | null = null;

    /** 特效父节点 */
    effectParent: Node | null = null;

    // ========== 生命周期 ==========

    onInit() {
        console.log("[GameViewComp] View component initialized");
    }

    // ========== 场景初始化 ==========

    /** 初始化场景节点 */
    initSceneNodes(sceneRoot: Node) {
        console.log('[GameViewComp] ========== initSceneNodes START ==========');
        this.sceneRoot = sceneRoot;

        console.log('[GameViewComp] Scene root name:', sceneRoot.name);
        console.log('[GameViewComp] Scene root children count:', sceneRoot.children.length);

        // 列出所有子节点名称
        sceneRoot.children.forEach((child, index) => {
            console.log(`[GameViewComp] Child ${index}: ${child.name}`);
        });

        // 查找子节点（使用原版名称）
        this.pushNode = sceneRoot.getChildByName('pushBox');  // 推动台碰撞盒
        this.coinParent = sceneRoot.getChildByName('coinParent');  // 金币父节点
        this.touchPlane = sceneRoot.getChildByName('touchPlane');  // 触摸平面

        // 查找摄像机（OOPS Framework 场景结构：root/game/Main Camera）
        console.log('[GameViewComp] Searching for camera...');

        // 方法1: 在游戏场景预制体内查找（如果摄像机在预制体内）
        this.cameraNode = sceneRoot.getChildByName('Main Camera');

        // 方法2: 在父节点（root/game）下查找
        if (!this.cameraNode && sceneRoot.parent) {
            this.cameraNode = sceneRoot.parent.getChildByName('Main Camera');
            console.log('[GameViewComp] Trying parent node (root/game):', !!this.cameraNode);
        }

        // 方法3: 全局查找 root/game/Main Camera
        if (!this.cameraNode) {
            this.cameraNode = cc.find('root/game/Main Camera');
            console.log('[GameViewComp] Trying global path root/game/Main Camera:', !!this.cameraNode);
        }

        console.log('[GameViewComp] Camera search result:', !!this.cameraNode);

        this.effectParent = sceneRoot.getChildByName('effParent');

        // 验证节点
        if (!this.pushNode) {
            console.warn('[GameViewComp] Push node (pushBox) not found!');
        } else {
            console.log('[GameViewComp] ✓ Push node found:', this.pushNode.name);
        }

        if (!this.coinParent) {
            console.warn('[GameViewComp] Coin parent (coinParent) not found!');
        } else {
            console.log('[GameViewComp] ✓ Coin parent found:', this.coinParent.name);
        }

        if (!this.touchPlane) {
            console.warn('[GameViewComp] Touch plane (touchPlane) not found!');
        } else {
            console.log('[GameViewComp] ✓ Touch plane found:', this.touchPlane.name);
        }

        if (!this.cameraNode) {
            console.warn('[GameViewComp] ⚠️ Camera node not found in scene root!');
            console.warn('[GameViewComp] Will try to find it in _initCamera()');
        } else {
            console.log('[GameViewComp] ✓ Camera node found:', this.cameraNode.name);
        }

        if (!this.effectParent) {
            console.warn('[GameViewComp] Effect parent (effParent) not found!');
        } else {
            console.log('[GameViewComp] ✓ Effect parent found with', this.effectParent.children.length, 'children');
        }

        console.log('[GameViewComp] Scene nodes initialized');

        // 设置 PhysicsComp 的场景节点引用
        if (this.pushNode && this.coinParent) {
            console.log('[GameViewComp] Setting PhysicsComp nodes...');
            const physicsComp = this.ent.get(PhysicsComp);
            if (physicsComp) {
                physicsComp.pushNode = this.pushNode;
                physicsComp.coinParent = this.coinParent;
                console.log('[GameViewComp] ✅ PhysicsComp nodes set successfully');

                // 异步加载金币预制体
                console.log('[GameViewComp] Starting to load coin prefab...');
                this._loadCoinPrefab(physicsComp);
            } else {
                console.error('[GameViewComp] ❌ PhysicsComp not found!');
            }
        } else {
            console.error('[GameViewComp] ❌ Cannot set PhysicsComp: pushNode or coinParent is null');
            console.error('[GameViewComp]   - pushNode:', !!this.pushNode);
            console.error('[GameViewComp]   - coinParent:', !!this.coinParent);
        }

        // 初始化摄像机
        this._initCamera();

        // 初始化触摸平面
        this._initTouchPlane();
    }

    /** 加载金币预制体 */
    private async _loadCoinPrefab(physicsComp: PhysicsComp) {
        try {
            console.log('[GameViewComp] Loading coin prefab...');
            const prefab = await oops.res.loadAsync('prefab/model/coin', Prefab) as Prefab;
            if (prefab) {
                physicsComp.coinPrefab = prefab;
                console.log('[GameViewComp] ✓ Coin prefab loaded successfully');
            } else {
                console.error('[GameViewComp] Failed to load coin prefab: prefab is null');
            }
        } catch (error) {
            console.error('[GameViewComp] Error loading coin prefab:', error);
        }
    }

    /** 初始化摄像机 */
    private _initCamera() {
        console.log('[GameViewComp] ========== _initCamera START ==========');
        console.log('[GameViewComp] cameraNode:', !!this.cameraNode);

        if (!this.cameraNode) {
            console.warn('[GameViewComp] Camera not found in initSceneNodes, searching globally...');

            // OOPS Framework 场景结构: root/game/Main Camera
            this.cameraNode = cc.find('root/game/Main Camera');

            if (!this.cameraNode) {
                console.error('[GameViewComp] ❌ Main Camera not found at root/game/Main Camera!');
                return;
            } else {
                console.log('[GameViewComp] ✅ Found camera globally:', this.cameraNode.name);
            }
        }

        // ⚠️ 重要：禁用 OrbitCamera 组件，防止它自动控制摄像机位置
        const orbitCamera = this.cameraNode.getComponent('OrbitCamera');
        if (orbitCamera) {
            (orbitCamera as Component).enabled = false;
            console.log('[GameViewComp] OrbitCamera component disabled');
        }

        // 设置摄像机正确位置（参考原版推币机）
        this.cameraNode.setPosition(-0.06, 8.07, 10.391);
        this.cameraNode.setRotationFromEuler(-24.302, 0, 0);
        console.log('[GameViewComp] Camera position set to:', this.cameraNode.position);

        // ✅ 立即启用摄像机（单机模式不需要等待登录）
        const camera = this.cameraNode.getComponent(Camera);
        if (camera) {
            camera.enabled = true;
            console.log('[GameViewComp] ✅ Camera ENABLED at initialization');
        }

        // 停止摄像机动画
        const animation = this.cameraNode.getComponent(Animation);
        if (animation) {
            animation.stop();
        }

        console.log('[GameViewComp] Camera initialized and enabled');
    }

    /** 初始化触摸平面 */
    private _initTouchPlane() {
        // 默认隐藏触摸平面
        this.setTouchPlaneVisible(false);
    }

    // ========== 视图控制 ==========

    /** 显示/隐藏触摸平面 */
    setTouchPlaneVisible(visible: boolean) {
        if (this.touchPlane) {
            this.touchPlane.active = visible;
        }
    }

    /** 启用摄像机并播放动画 */
    playCameraAnimation(onFinished?: () => void) {
        if (!this.cameraNode) {
            console.error('[GameViewComp] Camera node not found');
            onFinished?.();
            return;
        }

        // 确保摄像机位置正确
        console.log('[GameViewComp] Setting camera to correct position before enabling');
        this.cameraNode.setPosition(-0.06, 8.07, 10.391);
        this.cameraNode.setRotationFromEuler(-24.302, 0, 0);

        // 启用摄像机
        const camera = this.cameraNode.getComponent(Camera);
        if (camera) {
            camera.enabled = true;
            console.log('[GameViewComp] Camera enabled at position:', this.cameraNode.position);
        }

        // 播放摄像机动画
        const animation = this.cameraNode.getComponent(Animation);
        if (animation && animation.defaultClip) {
            console.log('[GameViewComp] Playing camera animation, duration:', animation.defaultClip.duration);

            // 监听动画结束事件
            animation.once(Animation.EventType.FINISHED, () => {
                console.log('[GameViewComp] Camera animation finished');

                // 动画结束后，强制设置摄像机到正确的游戏位置
                // 原版推币机的摄像机游戏位置
                this.cameraNode!.setPosition(-0.06, 8.07, 10.391);
                this.cameraNode!.setRotationFromEuler(-24.302, 0, 0);
                console.log('[GameViewComp] Camera reset to game position:', this.cameraNode!.position);

                onFinished?.();
            });

            // 播放动画
            animation.play();
        } else {
            console.log('[GameViewComp] No camera animation, setting final position directly');
            // 没有动画，直接设置到游戏位置
            this.cameraNode.setPosition(-0.06, 8.07, 10.391);
            this.cameraNode.setRotationFromEuler(-24.302, 0, 0);
            onFinished?.();
        }
    }

    // ========== 清理 ==========

    onDestroy() {
        console.log('[GameViewComp] Component destroyed');
        this.sceneRoot = null;
        this.pushNode = null;
        this.coinParent = null;
        this.touchPlane = null;
        this.cameraNode = null;
        this.effectParent = null;
    }
}
