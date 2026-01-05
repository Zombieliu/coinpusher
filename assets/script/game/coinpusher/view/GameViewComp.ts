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

import { Node, Camera, Animation, Component, Prefab, RigidBody, MeshRenderer, instantiate, Material, primitives, utils, BoxCollider, Vec3, Mat4, Quat, PhysicsMaterial, Texture2D, Color, Layers } from "cc";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { PhysicsComp } from "../bll/PhysicsComp";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { NumFont } from "../../utils/numFont";
import { GameConfig } from "../model/GameConfig";
import { smc } from "../../common/ecs/SingletonModuleComp";

@ecs.register("GameView")
export class GameViewComp extends ecs.Comp {
    // ========== 场景节点引用 ==========
    /** 游戏场景根节点 */
    sceneRoot: Node | null = null;

    /** 推动台节点 */
    pushNode: Node | null = null;

    /** 推动台可视模型（用于表现同步） */
    pushVisualNode: Node | null = null;

    /** 金币父节点 */
    coinParent: Node | null = null;

    /** 触摸平面节点 */
    touchPlane: Node | null = null;

    /** 摄像机节点 */
    cameraNode: Node | null = null;

    /** 特效父节点 */
    effectParent: Node | null = null;

    /** 金币 3D 数码管节点 */
    private _numFontNode: Node | null = null;

    /** 金币 3D 数码管组件 */
    private _numFontComp: NumFont | null = null;

    /** 防止重复执行灯牌修复逻辑 */
    private _isEnsuringBoardEffects = false;
    private _coinMaterial: Material | null = null;

    /** 是否已注册金币事件 */
    private _goldListenerBound = false;

    /** 轮询更新定时器（兜底，防止事件丢失） */
    private _goldPollTimer: any = null;
    private _lastPolledGold: number = Number.NaN;

    /** 复用临时对象，避免频繁分配 */
    private _tmpMat4: Mat4 = new Mat4();
    private _tmpVec: Vec3 = new Vec3();

    // ========== 生命周期 ==========

    onInit() {
        console.log("[GameViewComp] View component initialized");
        oops.message.on(GameConfig.EVENT_LIST.GOLD_CHANGED, this._onGoldChanged, this);
        this._goldListenerBound = true;
        // 初始化时也尝试从存储恢复一次，避免事件顺序问题
        this._updateGoldDisplay();
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
        this.pushVisualNode = sceneRoot.getChildByName('pushModel'); // 推动台模型
        this.coinParent = sceneRoot.getChildByName('coinParent');  // 金币父节点
        this.touchPlane = sceneRoot.getChildByName('touchPlane') || this.touchPlane;  // 触摸平面

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
        this._numFontNode = sceneRoot.getChildByName('numFont');
        if (this._numFontNode) {
            this._numFontComp = this._numFontNode.getComponent(NumFont) || this._numFontNode.addComponent(NumFont);
            console.log('[GameViewComp] ✓ NumFont node found (direct child)');
        }
        // 兜底：深度搜索 NumFont 组件
        if (!this._numFontComp) {
            const comps = sceneRoot.getComponentsInChildren(NumFont);
            if (comps?.length) {
                this._numFontComp = comps[0];
                this._numFontNode = this._numFontComp.node;
                console.log('[GameViewComp] ✓ NumFont component found via deep search:', this._numFontNode?.name);
            }
        }
        if (!this._numFontComp) {
            console.warn('[GameViewComp] ⚠️ NumFont node not found in scene (name maybe changed)');
        } else {
            this._updateGoldDisplay();
        }

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

        if (!this.pushVisualNode) {
            console.warn('[GameViewComp] Push visual node (pushModel) not found!');
        } else {
            console.log('[GameViewComp] ✓ Push visual node found:', this.pushVisualNode.name);
        }

        if (!this.touchPlane) {
            console.log('[GameViewComp] Touch plane not found in prefab, will create runtime node');
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
            void this._ensureBoardEffects();
        }

        console.log('[GameViewComp] Scene nodes initialized');

        // 设置 PhysicsComp 的场景节点引用
        if (this.coinParent) {
            console.log('[GameViewComp] Disabling physics on prefab coins to prevent falling');
            this.coinParent.children.forEach(child => {
                const rb = child.getComponent(RigidBody);
                if (rb) {
                    rb.enabled = false;
                    child.removeComponent(RigidBody);
                }
            });
            // 确保金币父节点使用 3D 默认层（避免被 UI 摄像机渲染成粉色占位）
            this._setLayerRecursive(this.coinParent, Layers.Enum.DEFAULT);
        }

        if (this.pushNode && this.coinParent) {
            console.log('[GameViewComp] Setting PhysicsComp nodes...');
            const physicsComp = this.ent.get(PhysicsComp);
            if (physicsComp) {
                physicsComp.pushNode = this.pushNode;
                physicsComp.pushVisualNode = this.pushVisualNode;
                physicsComp.coinParent = this.coinParent;
                console.log('[GameViewComp] ✅ PhysicsComp nodes set successfully');
                oops.message.dispatchEvent('PHYSICS_READY');

                // 兜底：确保场景里已有的金币材质可用（避免 mat_lowFriction 丢失导致不可见）
                this._ensureExistingCoinMaterials();

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

        // 确保进入场景后立即显示当前金币
        this._updateGoldDisplay();
        this._startGoldPolling(); // 兜底：即便事件丢失也会刷新显示
    }

    /** 加载金币预制体 */
    private async _loadCoinPrefab(physicsComp: PhysicsComp) {
        try {
            console.log('[GameViewComp] Loading coin prefab...');
            const prefab = await oops.res.loadAsync('prefab/model/coin', Prefab) as Prefab;
            if (prefab) {
                await this._ensureCoinPrefabMaterial(prefab);
                physicsComp.coinPrefab = prefab;
                console.log('[GameViewComp] ✓ Coin prefab loaded successfully');
            } else {
                console.error('[GameViewComp] Failed to load coin prefab: prefab is null');
            }
        } catch (error) {
            console.error('[GameViewComp] Error loading coin prefab:', error);
        }

        // 通知前端（例如 GamePanel）prefab 已就绪，可做兜底铺币等操作
        oops.message.dispatchEvent('COIN_PREFAB_READY');
    }

    /** 为已加载的 coin 预制体补齐材质（防止 mat_lowFriction 丢失导致不可见） */
    private async _ensureCoinPrefabMaterial(prefab: Prefab) {
        const fallback = await this._getCoinMaterial();
        try {
            const temp = instantiate(prefab);
            const mr = temp.getComponentInChildren(MeshRenderer);
            if (mr) {
                this._applyFallbackMaterial(mr, fallback);
                // 将修正后的材质写回 prefab 数据，后续实例化直接使用
                const prefabMr = prefab.data?.getComponentInChildren(MeshRenderer);
                prefabMr?.setMaterial(fallback, 0);
            }
            temp.destroy();
        } catch (err) {
            console.warn('[GameViewComp] Failed to patch coin prefab material:', err);
        }
    }

    /** 场景内已有金币的材质兜底 */
    private async _ensureExistingCoinMaterials() {
        if (!this.coinParent) return;
        const fallback = await this._getCoinMaterial();
        this.coinParent.children.forEach(child => {
            const mr = child.getComponent(MeshRenderer) || child.getComponentInChildren(MeshRenderer);
            if (mr) {
                this._applyFallbackMaterial(mr, fallback);
            }
        });
    }

    /** 返回内置金色材质（不依赖外部贴图，避免缺包变粉） */
    private async _getCoinMaterial(): Promise<Material> {
        if (this._coinMaterial) return this._coinMaterial;
        const mat = new Material();
        mat.initialize({ effectName: 'builtin-standard' });
        mat.setProperty('albedo', new Color(255, 220, 60, 255));
        mat.setProperty('roughness', 0.18);
        mat.setProperty('metallic', 0.7);
        this._coinMaterial = mat;
        console.log('[GameViewComp] Using built-in gold material (no external texture)');
        return this._coinMaterial;
    }

    /** 强制将金币渲染器替换为指定材质 */
    private _applyFallbackMaterial(mr: MeshRenderer, fallback: Material) {
        mr.setMaterial(fallback, 0);
    }

    /** 递归设置节点及子节点的渲染层 */
    private _setLayerRecursive(node: Node, layer: number) {
        node.layer = layer;
        node.children.forEach(c => this._setLayerRecursive(c, layer));
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
            // 确保能渲染到自定义层（部分 prefab 的 touchPlane 处于高位 layer）
            camera.visibility = 0xffffffff;
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
        // 如果 prefab 里没有 touchPlane，则动态创建一个节点，避免 null 警告
        if (!this.touchPlane && this.sceneRoot) {
            this.touchPlane = new Node('touchPlane');
            this.touchPlane.parent = this.sceneRoot.getChildByName('pushModel') || this.sceneRoot;
            this.touchPlane.setPosition(0, 0.02, 0);
            this.touchPlane.setRotationFromEuler(-90, 0, 0);
        }

        if (this.touchPlane && this.pushVisualNode) {
            // 将触摸平面层级与推台可视模型保持一致，避免被相机可见性过滤
            this.touchPlane.layer = this.pushVisualNode.layer;
        }
        // 默认隐藏触摸平面
        this.setTouchPlaneVisible(false);
        void this._ensureTouchPlaneAppearance();
        this._ensureFrontRamp();
    }

    // ========== 视图控制 ==========

    /** 显示/隐藏触摸平面 */
    setTouchPlaneVisible(visible: boolean) {
        if (this.touchPlane) {
            this.touchPlane.active = visible;
            console.log(`[GameViewComp] TouchPlane set to ${visible ? 'active' : 'inactive'}`);
        }
    }

    /**
     * 确保触摸平面有可见的紫色提示材质（还原原版粉紫“点击区域”效果）
     */
    private async _ensureTouchPlaneAppearance() {
        if (!this.touchPlane) return;

        let mr = this.touchPlane.getComponent(MeshRenderer);
        if (!mr) {
            mr = this.touchPlane.addComponent(MeshRenderer);
        }

        // 只负责材质与 mesh 尺寸，位置/旋转已在 prefab 中贴在 pushModel 上
        try {
            const collider = this.pushVisualNode?.getComponent(BoxCollider) ?? this.pushNode?.getComponent(BoxCollider);
            let width = 8;
            let depth = 6;
            if (collider && collider.size) {
                // 使用 pushModel 本地尺寸（忽略父旋转，因已经是子节点）
                const scale = (this.touchPlane.parent ?? this.pushVisualNode ?? this.pushNode)?.scale ?? Vec3.ONE;
                width = collider.size.x * scale.x * 1.02;
                depth = collider.size.z * scale.z * 1.02;
            }
            const quad = primitives.quad({ width, height: depth });
            mr.mesh = utils.createMesh(quad);
            this.touchPlane.setScale(1, 1, 1);
        } catch (err) {
            console.warn('[GameViewComp] Failed to create quad mesh for touchPlane:', err);
        }

        try {
            this.touchPlane.active = true;
            const mat = await oops.res.loadAsync('model/touchPlane/touchPlaneZh', Material) as Material;
            mr.setMaterial(mat, 0);
            console.log('[GameViewComp] TouchPlane material applied (Zh)');
        } catch (errZh) {
            console.warn('[GameViewComp] Failed to load Zh touchPlane material, fallback to En:', errZh);
            try {
                const matEn = await oops.res.loadAsync('model/touchPlane/touchPlaneEn', Material) as Material;
                mr.setMaterial(matEn, 0);
                console.log('[GameViewComp] TouchPlane material applied (En)');
            } catch (errEn) {
                console.error('[GameViewComp] Failed to load touchPlane material:', errEn);
                // 兜底：使用内置纯色材质，至少能看见一个可点击区域
                mr.material = Material.createWithBuiltin(Material.BUILTIN_NAME.SPRITE);
                console.warn('[GameViewComp] Applied builtin sprite material as fallback');
            }
        }
    }

    /** 销毁触摸平面（用于新手首次点击后） */
    destroyTouchPlane() {
        if (this.touchPlane && this.touchPlane.isValid) {
            this.touchPlane.destroy();
        }
        this.touchPlane = null;
    }

    /** 在推台前缘添加一个轻微下坡的辅助斜坡，减少硬币挂边 */
    private _ensureFrontRamp() {
        if (!this.pushNode) return;
        if (this.pushNode.getChildByName('frontRamp')) return;

        const ramp = new Node('frontRamp');
        ramp.parent = this.pushNode;

        // 参考 pushNode 的 collider 尺寸
        const collider = this.pushNode.getComponent(BoxCollider);
        const width = (collider?.size.x ?? 6.6) * (this.pushNode.worldScale.x ?? 1);
        const depth = Math.min((collider?.size.z ?? 1), 1.0);
        const height = 0.1;

        // 放在前缘（z 为正方向前缘）
        ramp.setPosition(0, (collider?.center.y ?? 0) + height * 0.5, (collider?.center.z ?? 0) + (collider?.size.z ?? 1) * 0.5 - depth * 0.5);
        ramp.setRotationFromEuler(-12, 0, 0); // 前倾 12°

        const rampCollider = ramp.addComponent(BoxCollider);
        rampCollider.size = new Vec3(width, height, depth);
        rampCollider.center = new Vec3(0, 0, 0);

        const mat = new PhysicsMaterial();
        mat.friction = 0.02;
        mat.rollingFriction = 0;
        mat.restitution = 0;
        rampCollider.material = mat;
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

                // 动画结束后显示触摸平面，引导玩家点击
                this.setTouchPlaneVisible(true);
                setTimeout(() => this.setTouchPlaneVisible(true), 0);

                void this._ensureBoardEffects();

                onFinished?.();
            });

            // 播放动画
            animation.play();
        } else {
            console.log('[GameViewComp] No camera animation, setting final position directly');
            // 没有动画，直接设置到游戏位置
            this.cameraNode.setPosition(-0.06, 8.07, 10.391);
            this.cameraNode.setRotationFromEuler(-24.302, 0, 0);
            this.setTouchPlaneVisible(true);
            // 兜底：下一宏任务再置一次，避免同帧其他脚本覆盖 active
            setTimeout(() => this.setTouchPlaneVisible(true), 0);
            void this._ensureBoardEffects();
            onFinished?.();
        }
    }

    /**
     * 确保四个灯牌特效（board1-4）存在且动画正常
     * 如果发现缺失或损坏，会从 effect/prefab/board 重新实例化对应节点
     */
    private async _ensureBoardEffects() {
        if (this._isEnsuringBoardEffects) {
            return;
        }

        this._isEnsuringBoardEffects = true;

        try {
            if (!this.effectParent) {
                console.warn('[GameViewComp] Cannot ensure board effects: effect parent missing');
                return;
            }

            const boardNameMap: Record<string, string> = {
                board1: 'Node',
                board2: 'Node-001',
                board3: 'Node-002',
                board4: 'Node-003'
            };

            const boardsToRepair: string[] = [];

            for (const boardName of Object.keys(boardNameMap)) {
                const boardNode = this.effectParent.getChildByName(boardName);
                if (!boardNode) {
                    console.warn(`[GameViewComp] ${boardName} is missing, will recreate`);
                    boardsToRepair.push(boardName);
                    continue;
                }

                const meshNode = boardNode.getChildByName('big');
                const meshRenderer = meshNode?.getComponent(MeshRenderer);
                const animation = boardNode.getComponent(Animation);

                if (!meshRenderer || !meshRenderer.mesh || meshRenderer.materials.length === 0) {
                    console.warn(`[GameViewComp] ${boardName} mesh is invalid, will recreate`);
                    boardsToRepair.push(boardName);
                    continue;
                }

                if (!animation || (!animation.defaultClip && animation.clips.length === 0)) {
                    console.warn(`[GameViewComp] ${boardName} animation missing, will recreate`);
                    boardsToRepair.push(boardName);
                    continue;
                }
            }

            if (!boardsToRepair.length) {
                return;
            }

            console.log('[GameViewComp] Recreating boards:', boardsToRepair.join(', '));

            const prefab = await oops.res.loadAsync('effect/prefab/board', Prefab) as Prefab;
            if (!prefab) {
                console.error('[GameViewComp] Failed to load board prefab');
                return;
            }

            const prefabInstance = instantiate(prefab);

            for (const boardName of boardsToRepair) {
                const sourceName = boardNameMap[boardName];
                const sourceNode = prefabInstance.getChildByName(sourceName);
                if (!sourceNode) {
                    console.warn(`[GameViewComp] Board prefab missing child ${sourceName}`);
                    continue;
                }

                const existing = this.effectParent.getChildByName(boardName);
                if (existing) {
                    existing.destroy();
                }

                sourceNode.removeFromParent();
                sourceNode.name = boardName;
                this.effectParent.addChild(sourceNode);

                const animation = sourceNode.getComponent(Animation);
                if (animation && animation.defaultClip) {
                    const state = animation.getState(animation.defaultClip.name);
                    if (!state || !state.isPlaying) {
                        animation.play(animation.defaultClip.name);
                    }
                }
            }

            prefabInstance.destroy();
        } catch (error) {
            console.error('[GameViewComp] Failed to ensure board effects:', error);
        } finally {
            this._isEnsuringBoardEffects = false;
        }
    }

    // ========== 清理 ==========

    onDestroy() {
        console.log('[GameViewComp] Component destroyed');

        // 取消事件监听
        if (this._goldListenerBound) {
            oops.message.off(GameConfig.EVENT_LIST.GOLD_CHANGED, this._onGoldChanged, this);
            this._goldListenerBound = false;
        }

        // 清理轮询
        if (this._goldPollTimer) {
            clearInterval(this._goldPollTimer);
            this._goldPollTimer = null;
        }

        this.sceneRoot = null;
        this.pushNode = null;
        this.coinParent = null;
        this.touchPlane = null;
        this.cameraNode = null;
        this.effectParent = null;
    }

    private _onGoldChanged(newGold: number) {
        console.log('[GameViewComp] GOLD_CHANGED event received:', newGold);
        this._updateGoldDisplay(newGold);
    }

    private _updateGoldDisplay(value?: number) {
        if (!this._numFontComp) {
            return;
        }

        const model = smc.coinPusher?.CoinModel;
        // 优先使用事件传入值，其次读取模型，再兜底读取上次登录存储的数值
        let total = value !== undefined ? value : (model?.totalGold ?? 0);
        if ((!total || isNaN(total)) && oops.storage) {
            const stored = oops.storage.getGlobalData?.('lastGold');
            // 兼容字符串存储
            const parsed = typeof stored === 'string' ? parseInt(stored, 10) : stored;
            if (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) {
                total = parsed;
                if (model) {
                    model.totalGold = parsed; // 同步回模型，避免再次显示 0
                }
            }
        }

        const displayValue = Math.max(0, Math.floor(total));
        this._numFontComp.updateShow(displayValue);
        console.log('[GameViewComp] Updated numFont display to:', displayValue);
    }

    /** 轮询金币以防事件链路缺失（开发期兜底） */
    private _startGoldPolling() {
        if (this._goldPollTimer) {
            return;
        }

        this._goldPollTimer = setInterval(() => {
            const model = smc.coinPusher?.CoinModel;
            if (!model) {
                return;
            }
            const current = Math.max(0, Math.floor(model.totalGold ?? 0));
            if (current !== this._lastPolledGold) {
                this._lastPolledGold = current;
                this._updateGoldDisplay(current);
            }
        }, 1000);
    }
}
