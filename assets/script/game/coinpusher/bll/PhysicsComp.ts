/**
 * @file PhysicsComp.ts
 * @description 客户端物理同步组件 (Renderer)
 *
 * 负责：
 * 1. 接收服务器快照
 * 2. 基于 serverTick 的插值渲染推板和金币（格斗游戏级别）
 * 3. 客户端预测（Fake Coins）
 * 4. 播放本地特效
 *
 * @architecture
 * - 服务器权威：所有物理计算在服务端 (Rapier)
 * - 客户端插值：基于 serverTick 在两个快照之间插值
 * - 时间同步：使用 RoomService 的 RTT 测量对齐时间轴
 */

import { Node, Vec3, Quat, instantiate, Prefab, NodePool, RigidBody } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { RoomService } from "../../network/RoomService";
import { GameConfig } from "../model/GameConfig";

if (GameConfig.PHYSICS_LOG_VERBOSE) {
    console.log("[DEBUG] PhysicsComp.ts loaded, about to register");
}
@ecs.register("PhysicsComp")
export class PhysicsComp extends ecs.Comp {
    // ========== 场景节点引用 ==========
    /** 推动台碰撞节点（用于物理） */
    pushNode: Node | null = null;

    /** 推动台可见模型节点（用于表现） */
    pushVisualNode: Node | null = null;

    /** 金币父节点 */
    coinParent: Node | null = null;

    /** 金币预制体 */
    coinPrefab: Prefab | null = null;
    /** 预制体加载 Promise（避免重复加载） */
    private _coinPrefabPromise: Promise<Prefab | null> | null = null;

    // ========== 网络服务 ==========
    /** Room 服务（用于获取快照和时间同步） */
    roomService: RoomService | null = null;

    // ========== 渲染状态 ==========
    /** 当前渲染的金币节点 Map<coinId, Node> */
    private _coinNodes: Map<number, Node> = new Map();

    /** 客户端预测的金币（未被服务器确认） */
    private _predictedCoins: Map<number, Node> = new Map();

    /** 金币对象池（性能优化） */
    private _coinPool: NodePool = new NodePool();

    /** 记录最近一次输出的金币统计，避免日志刷屏 */
    private _lastLoggedCoinCount = -1;
    private _lastCoinLogTick = -1;
    /** 是否输出调试日志 */
    private _logEnabled = GameConfig.PHYSICS_LOG_VERBOSE ?? false;

    // ========== 插值参数 ==========
    /** 渲染延迟（tick数） - 保持2个快照的缓冲，确保插值平滑 */
    private readonly INTERPOLATION_DELAY = 2;

    /** 服务器 tick 间隔 (ms) - 对应 30Hz */
    private readonly SERVER_TICK_INTERVAL_MS = 33;

    // ========== Temp 对象（避免 GC） ==========
    private _tempVec3 = new Vec3();
    private _tempQuat = new Quat();
    // 服务器坐标系 -> 客户端世界坐标系的 Z 轴偏移（随推板动态计算）
    private _serverToClientZ = GameConfig.PUSH_Z_OFFSET ?? 0;
    /** 服务器金币在前端的显示缩放（原版大小） */
    private readonly COIN_RENDER_SCALE = 1.0;

    /** 是否已收到首个服务器快照（用于清理本地兜底币） */
    private _hasFirstSnapshot = false;

    // ========== 推台初始缓存 ==========
    private _pushBaseCaptured = false;
    private _pushNodeBaseZ = 0;
    private _pushVisualBaseZ = 0;
    private _pushVisualOffset = new Vec3();
    private _tempWorldPosA = new Vec3();
    private _tempWorldPosB = new Vec3();
    private _predictedCoins: Map<number, Node> = new Map();
    private _predictedBirth: Map<number, number> = new Map(); // 预测币创建时间戳

    /** 清理当前所有可视金币/预测金币 */
    private _clearAllCoins() {
        this._coinNodes.forEach(node => node.destroy());
        this._coinNodes.clear();
        this._predictedCoins.forEach(node => node.destroy());
        this._predictedCoins.clear();
        this._predictedBirth.clear();
        this._coinPool.clear();
        if (this.coinParent) {
            this.coinParent.removeAllChildren();
        }
    }
    private _cachedPushNode: Node | null = null;
    private _cachedVisualNode: Node | null = null;

    // 网络卡顿/无快照兜底
    private _noSnapshotAccum = 0;
    private _fallbackLocalActive = false;

    // 网络卡顿/无快照兜底
    private _noSnapshotAccum = 0;
    private _fallbackLocalActive = false;

    // ========== 生命周期 ==========

    reset() {
        console.warn('[PhysicsComp] reset called, clearing node references');
        this.pushNode = null;
        this.pushVisualNode = null;
        this.coinParent = null;
        this.coinPrefab = null;
        this._coinPrefabPromise = null;
        this.roomService = null;
        this._coinNodes.clear();
        this._predictedCoins.clear();
        this._coinPool.clear();
        this._pushBaseCaptured = false;
        this._pushNodeBaseZ = 0;
        this._pushVisualBaseZ = 0;
        this._pushVisualOffset.set(0, 0, 0);
        this._tempWorldPosA.set(0, 0, 0);
        this._tempWorldPosB.set(0, 0, 0);
        this._cachedPushNode = null;
        this._cachedVisualNode = null;
        this._localModeInitialized = false;
        this._localPushConfigured = false;
    }

    // ========== 核心更新循环 ==========

    /**
     * 每帧更新 - 插值渲染
     * @param dt 帧间隔 (s)
     */
    update(dt: number) {
        // 本地模式：如果没有roomService，使用本地物理（临时方案）
        if (!this.roomService) {
            // console.log('[PhysicsComp] Running in local mode');
            this._updateLocalMode(dt);
            return;
        }

        if (!this.coinParent || !this.pushNode) return;

        // 如果没有金币预制体，尝试触发加载并等待
        if (!this.coinPrefab) {
            if (!this._coinPrefabPromise) {
                this.ensureCoinPrefab();
            }
            if (GameConfig.PHYSICS_LOG_VERBOSE) {
                console.log('[PhysicsComp] coinPrefab not ready, skip frame');
            }
            return;
        }

        const snapshots = this.roomService.snapshots;
        // 首个快照到达时，清理本地兜底金币，避免静态占位
        if (!this._hasFirstSnapshot && snapshots.length > 0) {
            this._clearAllCoins();
            this._hasFirstSnapshot = true;
        }

        // 若未收到快照，立即启用兜底本地铺币与推板动画
        if (!snapshots.length) {
            if (!this._fallbackLocalActive) {
                console.warn('[PhysicsComp] No snapshots yet, enabling fallback local visuals immediately');
                this._fallbackLocalActive = true;
                this._createInitialCoinsLocal();
                this._localModeInitialized = true;
            }
            this._animateLocalPush(dt);
            return;
        } else {
            if (this._fallbackLocalActive) {
                console.log('[PhysicsComp] Snapshots resumed, clearing fallback coins');
                this._clearAllCoins();
                this._fallbackLocalActive = false;
            }
            this._noSnapshotAccum = 0;
        }

        // 处理首帧快照：如果只有一个快照，直接渲染（不插值）
        if (snapshots.length === 1) {
            const snapshot = snapshots[0];
            this._renderSnapshot(snapshot);
            this._ensureVisibleCoinsWhenServerEmpty(snapshot, dt);
            return;
        }

        // 处理没有快照的情况
        if (snapshots.length < 2) {
            // 快照不足，跳过这一帧
            return;
        }

        // 1. 计算当前应该渲染的 serverTick（考虑插值延迟）
        const targetTick = this.roomService.estimatedServerTick - this.INTERPOLATION_DELAY;

        // 2. 从快照缓冲区找到合适的插值区间
        const { prev, next, alpha } = this._findInterpolationSnapshots(targetTick);

        if (!prev || !next) {
            // 快照不足，使用最新快照直接渲染
            if (snapshots.length > 0) {
                const latest = snapshots[snapshots.length - 1];
                this._renderSnapshot(latest);
                this._ensureVisibleCoinsWhenServerEmpty(latest, dt);
            }
            return;
        }

        // 3. 插值推板位置
        this._interpolatePushPlatform(prev, next, alpha);

        // 4. 插值金币
        this._interpolateCoins(prev, next, alpha);

        // 5. 如果服务器快照没有金币，保持本地视觉金币别“闪一下就没了”
        this._ensureVisibleCoinsWhenServerEmpty(next, dt);

        // 6. 清理超时预测币，避免悬空残影
        this._cleanupPredictedCoins();
    }

    /** 移除超时未确认的预测币，避免悬空残影 */
    private _cleanupPredictedCoins(timeoutMs: number = 1200) {
        if (this._predictedCoins.size === 0) return;
        const now = Date.now();
        const toRemove: number[] = [];
        this._predictedBirth.forEach((birth, id) => {
            if (now - birth > timeoutMs) {
                toRemove.push(id);
            }
        });
        toRemove.forEach(id => {
            const node = this._predictedCoins.get(id);
            if (node) {
                node.destroy();
            }
            this._predictedCoins.delete(id);
            this._predictedBirth.delete(id);
        });
    }

    /**
     * 当服务器快照为空台面时，自动补充本地静态金币，避免玩家看到瞬间清空
     */
    private _ensureVisibleCoinsWhenServerEmpty(snapshot: any, dt: number) {
        if (GameConfig.DISABLE_FALLBACK_COINS) return;
        if (!this.coinParent || !this.coinPrefab) return;

        const serverCoinCount = snapshot?.data?.coins?.length ?? 0;
        const hasChildren = this.coinParent.children.length > 0;
        const hasTracked = this._coinNodes.size > 0;

        // 仅在服务器明确为 0 且本地也空的时候补充；若已有服务器金币则不干预
        if (serverCoinCount === 0 && !hasChildren && !hasTracked) {
            if (!this._fallbackLocalActive) {
                console.warn('[PhysicsComp] Server reports 0 coins, restoring local fallback visuals');
                this._fallbackLocalActive = true;
                this._localModeInitialized = false; // 允许重新铺设
            }
            // 复用本地模式铺币 + 推板动画
            this._createInitialCoinsLocal();
            this._localModeInitialized = true;
            this._animateLocalPush(dt);
        }
    }

    /**
     * 直接渲染单个快照（无插值）
     * @param snapshot 快照数据
     */
    private _renderSnapshot(snapshot: any) {
        if (!this.pushNode || !this.coinParent || !this.coinPrefab) return;

        // 渲染推板
        const pushZ = snapshot.data?.pushZ ?? snapshot.data?.push_z ?? 0;
        this._syncPushNodeZ(pushZ);

        // 渲染金币
        const coins = snapshot.data?.coins || [];
        coins.forEach((coinData: any) => {
            this._updateOrCreateCoin(coinData.id, coinData.p, coinData.r);
        });

        // 处理移除的硬币
        const removed = snapshot.data?.removed || [];
        removed.forEach((id: number) => {
            const node = this._coinNodes.get(id);
            if (node) {
                this._coinPool.put(node);
                this._coinNodes.delete(id);
            }
        });

        this._logCoinSnapshot("[render]", snapshot.serverTick ?? -1, coins.length, removed.length);
    }

    /**
     * 查找插值用的快照对
     * @param targetTick 目标 tick
     * @returns { prev, next, alpha }
     */
    private _findInterpolationSnapshots(targetTick: number): {
        prev: any | null;
        next: any | null;
        alpha: number;
    } {
        if (!this.roomService) return { prev: null, next: null, alpha: 0 };

        const snapshots = this.roomService.snapshots;
        if (snapshots.length < 2) return { prev: null, next: null, alpha: 0 };

        // 找到 targetTick 所在的快照区间 [prev, next]
        let prev: any = null;
        let next: any = null;

        for (let i = 0; i < snapshots.length - 1; i++) {
            const s0 = snapshots[i];
            const s1 = snapshots[i + 1];

            if (s0.serverTick <= targetTick && targetTick <= s1.serverTick) {
                prev = s0;
                next = s1;
                break;
            }
        }

        // 如果没找到合适的区间，使用最新的两个快照
        if (!prev || !next) {
            prev = snapshots[snapshots.length - 2];
            next = snapshots[snapshots.length - 1];
        }

        // 计算插值系数 alpha ∈ [0, 1]
        const tickRange = next.serverTick - prev.serverTick;
        const alpha = tickRange > 0 ? (targetTick - prev.serverTick) / tickRange : 0;

        return { prev, next, alpha: Math.max(0, Math.min(1, alpha)) };
    }

    /**
     * 插值推板位置
     */
    private _interpolatePushPlatform(prev: any, next: any, alpha: number) {
        if (!this.pushNode) return;

        const prevZ = prev.data.pushZ;
        const nextZ = next.data.pushZ;

        // 线性插值 Z 轴
        const currentZ = prevZ + (nextZ - prevZ) * alpha;

        this._syncPushNodeZ(currentZ);
    }

    /**
     * 插值金币（增量更新版）
     */
    private _interpolateCoins(prev: any, next: any, alpha: number) {
        if (!this.coinParent || !this.coinPrefab) return;

        // 1. 处理增量更新的硬币（新增或状态变化）
        next.data.coins.forEach((coinData: any) => {
            const coinId = coinData.id;

            // 查找对应的前一帧数据
            const prevCoin = prev.data.coins.find((c: any) => c.id === coinId);
            if (!prevCoin) {
                // 新金币，直接使用 next 的位置（无插值）
                this._updateOrCreateCoin(coinId, coinData.p, coinData.r);
            } else {
                // 插值位置和旋转
                this._interpolateCoin(coinId, prevCoin, coinData, alpha);
            }
        });

        // 2. 处理被移除的硬币（服务器明确通知）
        if (next.data.removed && next.data.removed.length > 0) {
            next.data.removed.forEach((id: number) => {
                const node = this._coinNodes.get(id);
                if (node) {
                    this._coinPool.put(node);
                    this._coinNodes.delete(id);
                }

                // 同时清理预测硬币
                const predictedNode = this._predictedCoins.get(id);
                if (predictedNode) {
                    this._coinPool.put(predictedNode);
                    this._predictedCoins.delete(id);
                    console.log(`[PhysicsComp] Confirmed predicted coin ${id} collected`);
                }
            });
        }

        this._logCoinSnapshot("[interpolate]", next.serverTick ?? -1, next.data.coins.length, next.data.removed?.length ?? 0);

        // 3. 清理未被服务器确认的预测金币（超时）
        // 注意：由于增量更新，我们不再根据"不在 coins 列表"来删除，而是等待 removed 通知
        // 但预测金币如果长时间未被确认，仍需清理（防止内存泄漏）
        // 这里可以加一个时间戳判断，超过N秒未确认则删除
    }

    /**
     * 插值单个金币
     */
    private _interpolateCoin(
        coinId: number,
        prevData: { p: { x: number; y: number; z: number }; r: { x: number; y: number; z: number; w: number } },
        nextData: { p: { x: number; y: number; z: number }; r: { x: number; y: number; z: number; w: number } },
        alpha: number
    ) {
        // 位置插值
        this._tempVec3.set(
            prevData.p.x + (nextData.p.x - prevData.p.x) * alpha,
            prevData.p.y + (nextData.p.y - prevData.p.y) * alpha,
            prevData.p.z + (nextData.p.z - prevData.p.z) * alpha
        );

        // 旋转插值（四元数 Slerp）
        const prevQuat = new Quat(prevData.r.x, prevData.r.y, prevData.r.z, prevData.r.w);
        const nextQuat = new Quat(nextData.r.x, nextData.r.y, nextData.r.z, nextData.r.w);
        Quat.slerp(this._tempQuat, prevQuat, nextQuat, alpha);

        this._updateOrCreateCoin(coinId, this._tempVec3, this._tempQuat);
    }

    /** 记录快照中的金币统计信息，便于排查“看不到金币” */
    private _logCoinSnapshot(source: string, tick: number, coinCount: number, removedCount: number) {
        if (!this._logEnabled) return;
        const shouldLog =
            this._lastCoinLogTick !== tick ||
            this._lastLoggedCoinCount !== coinCount;

        if (!shouldLog) {
            return;
        }

        console.log(
            `[PhysicsComp] ${source} tick=${tick} coins=${coinCount} removed=${removedCount} activeNodes=${this._coinNodes.size}`
        );
        this._lastCoinLogTick = tick;
        this._lastLoggedCoinCount = coinCount;
    }

    /**
     * 更新或创建金币节点
     */
    private _updateOrCreateCoin(
        coinId: number,
        pos: { x: number; y: number; z: number } | Vec3,
        rot: { x: number; y: number; z: number; w: number } | Quat
    ) {
        // 优先复用预测金币节点，避免“双影”
        let node = this._coinNodes.get(coinId) || this._predictedCoins.get(coinId);

        if (!node) {
            // 创建新金币
            if (this._coinPool.size() > 0) {
                node = this._coinPool.get()!;
            } else {
                node = instantiate(this.coinPrefab!);
                // 服务器同步的金币只负责渲染，不需要本地物理，否则会被重力拖走
                const rigidBody = node.getComponent(RigidBody);
                if (rigidBody) {
                    rigidBody.enabled = false;
                    node.removeComponent(RigidBody);
                }
            }

            node.parent = this.coinParent;
            node.active = true;
            this._coinNodes.set(coinId, node);
            console.log(`[PhysicsComp] Created coin node ${coinId}, activeNodes=${this._coinNodes.size}`);
        } else {
            // 从对象池取出的节点可能被置为 inactive，这里确保重新启用
            node.active = true;
            node.parent = this.coinParent;

            const rigidBody = node.getComponent(RigidBody);
            if (rigidBody) {
                rigidBody.enabled = false;
                node.removeComponent(RigidBody);
            }
        }

        // 更新位置和旋转（使用世界坐标），仅对 Y 做上下限保护，避免硬币半埋或漂浮
        const px = pos instanceof Vec3 ? pos.x : pos.x;
        const py = pos instanceof Vec3 ? pos.y : pos.y;
        // 映射服务器 Z 到客户端推台坐标系并夹住范围
        const pz = this._mapServerZToClient(pos instanceof Vec3 ? pos.z : pos.z);

        // 台面实际高度约 0.0~0.5，把可视 Y 夹到一个合理区间
        const clampedY = Math.min(Math.max(0.05, py), 0.25);
        node.setWorldPosition(px, clampedY, pz);

        if (rot instanceof Quat) {
            node.setWorldRotation(rot);
        } else {
            node.setWorldRotation(rot.x, rot.y, rot.z, rot.w);
        }

        // 缩放至与服务器物理尺寸一致（默认 prefab 偏大）
        node.setWorldScale(this.COIN_RENDER_SCALE, this.COIN_RENDER_SCALE, this.COIN_RENDER_SCALE);

        // 如果是预测节点，去掉预测标记并登记为正式节点
        if (this._predictedCoins.has(coinId)) {
            this._predictedCoins.delete(coinId);
            this._predictedBirth.delete(coinId);
            this._coinNodes.set(coinId, node);
        }
    }

    // ========== 客户端预测 ==========

    /**
     * 创建金币（临时方法，应该通过服务器创建）
     * @param pos 位置
     * @param eul 旋转（可选）
     * @returns 创建的节点
     */
    createCoin(pos: Vec3, eul?: Vec3): Node | null {
        console.warn('[PhysicsComp] createCoin called - This should be handled by server in production');

        if (!this.coinParent || !this.coinPrefab) {
            console.warn('[PhysicsComp] Cannot create coin: missing parent or prefab');
            return null;
        }

        let node: Node;
        if (this._coinPool.size() > 0) {
            node = this._coinPool.get()!;
        } else {
            node = instantiate(this.coinPrefab);
        }

        // 先挂到父节点，再按世界坐标放置，避免父节点偏移导致位置错误
        node.parent = this.coinParent;
        node.setWorldPosition(pos);

        // 设置旋转（如果有）
        if (eul) {
            node.setRotationFromEuler(eul.x, eul.y, eul.z);
        }

        node.layer = this.coinParent.layer;

        // 生成临时ID存储
        const tempId = Date.now() + Math.random();
        this._coinNodes.set(tempId, node);

        return node;
    }

    /**
     * 创建预测金币（投币时立即显示，零延迟手感）
     * @param coinId 金币ID
     * @param x X 坐标
     * @returns 创建的节点（用于播放特效等）
     */
    createPredictedCoin(coinId: number, x: number): Node | null {
        if (!this.coinParent || !this.coinPrefab) return null;

        let node: Node;
        if (this._coinPool.size() > 0) {
            node = this._coinPool.get()!;
        } else {
            node = instantiate(this.coinPrefab);
        }

        // 设置初始位置（与服务器参数一致，避免空中跳变）
        node.parent = this.coinParent;
        const dropY = GameConfig.GOLD_DROP_POS_Y ?? 3.0;
        // 优先使用 pushNode 的世界坐标，避免落到背板/跑道外
        let dropZ = GameConfig.GOLD_DROP_POS_Z ?? -7.2;
        if (this.pushNode) {
            this.pushNode.getWorldPosition(this._tempWorldPosA);
            dropZ = this._tempWorldPosA.z;
        }
        node.setWorldPosition(x, dropY, dropZ);

        // 预测币只做视觉，移除刚体避免悬空/穿模
        const rigidBody = node.getComponent(RigidBody);
        if (rigidBody) {
            rigidBody.enabled = false;
            node.removeComponent(RigidBody);
        }

        this._predictedCoins.set(coinId, node);
        this._predictedBirth.set(coinId, Date.now());

        // 缩放与服务器尺寸一致
        node.setWorldScale(this.COIN_RENDER_SCALE, this.COIN_RENDER_SCALE, this.COIN_RENDER_SCALE);

        return node;
    }

    // ========== 本地模式（无服务器） ==========

    private _localModeInitialized = false;
    private _localPushConfigured = false;
    private _localPushDir = 1;
    private _localPushSpeed = 3;
    private _localPushZMin = -6;
    private _localPushZMax = -2;

    /**
     * 本地模式更新（用于无服务器测试）
     */
    private _updateLocalMode(dt: number) {
        // 详细的条件检查和日志
        if (!this.coinParent) {
            // console.log('[PhysicsComp] ⏳ Waiting for coinParent...');
            return;
        }
        if (!this.pushNode) {
            // console.log('[PhysicsComp] ⏳ Waiting for pushNode...');
            return;
        }
        if (!this.coinPrefab) {
            // 主动触发加载，等待加载完成
            if (!this._coinPrefabPromise) {
                this.ensureCoinPrefab();
            }
            return;
        }

        // 首次初始化：创建台面金币
        if (!this._localModeInitialized) {
            console.log('[PhysicsComp] ========== INITIALIZING LOCAL MODE ==========');
            console.log('[PhysicsComp] coinParent:', this.coinParent.name);
            console.log('[PhysicsComp] pushNode:', this.pushNode.name);
            console.log('[PhysicsComp] coinPrefab:', !!this.coinPrefab);

            this._localModeInitialized = true;
            this._createInitialCoinsLocal();
            console.log('[PhysicsComp] ✅ Local mode initialized with initial coins');
        }

        this._animateLocalPush(dt);
    }

    // ========== 资源加载 ==========

    /** 确保金币 prefab 已加载（防止重复并发加载） */
    async ensureCoinPrefab(): Promise<Prefab | null> {
        if (this.coinPrefab) return this.coinPrefab;
        if (this._coinPrefabPromise) return this._coinPrefabPromise;
        this._coinPrefabPromise = this._loadCoinPrefab();
        return this._coinPrefabPromise;
    }

    private async _loadCoinPrefab(): Promise<Prefab | null> {
        try {
            console.log('[PhysicsComp] Loading coin prefab...');
            const prefab = await oops.res.loadAsync('prefab/model/coin', Prefab) as Prefab;
            this.coinPrefab = prefab;
            // 通知其他组件（GamePanel 等）prefab 已就绪
            oops.message.dispatchEvent('COIN_PREFAB_READY');
            console.log('[PhysicsComp] ✅ Coin prefab loaded');
            return prefab;
        } catch (error) {
            console.error('[PhysicsComp] ❌ Failed to load coin prefab:', error);
            this._coinPrefabPromise = null;
            return null;
        }
    }

    /**
     * 创建初始金币（本地模式）
     */
    private _createInitialCoinsLocal() {
        const GOLD_ON_STAND_POS_Y = 0.17;
        const GOLD_ON_STAND_POS_MAX_X = 3.7;
        const GOLD_ON_STAND_POS_MIN_Z = -6.0;
        const GOLD_ON_STAND_POS_MAX_Z = 0.679;
        const GOLD_SIZE = 1.35;

        let coinCount = 0;
        let x = 0.0;
        let z = GOLD_ON_STAND_POS_MIN_Z;

        while (z < GOLD_ON_STAND_POS_MAX_Z) {
            if (x === 0.0) {
                this._createLocalCoin(x, GOLD_ON_STAND_POS_Y, z);
                coinCount++;
            } else {
                this._createLocalCoin(x, GOLD_ON_STAND_POS_Y, z);
                this._createLocalCoin(-x, GOLD_ON_STAND_POS_Y, z);
                coinCount += 2;
            }

            x += GOLD_SIZE;

            if (x > GOLD_ON_STAND_POS_MAX_X) {
                x = 0.0;
                z += GOLD_SIZE;
            }
        }

        console.log(`[PhysicsComp] Created ${coinCount} initial coins (local mode)`);
    }

    /**
     * 创建本地金币节点
     */
    private _createLocalCoin(x: number, y: number, z: number) {
        if (!this.coinParent || !this.coinPrefab) return;

        let node: Node;
        if (this._coinPool.size() > 0) {
            node = this._coinPool.get()!;
        } else {
            node = instantiate(this.coinPrefab);
        }

        // 本地模式：禁用物理组件，防止金币掉落（必须在设置父节点之前）
        const rigidBody = node.getComponent(RigidBody);
        if (rigidBody) {
            rigidBody.enabled = false;
            console.log('[PhysicsComp] Disabled RigidBody for local coin');
        }

        node.setPosition(x, y, this._clampWorldZ(z));
        node.parent = this.coinParent;

        // 缩放与服务器尺寸一致
        node.setWorldScale(this.COIN_RENDER_SCALE, this.COIN_RENDER_SCALE, this.COIN_RENDER_SCALE);

        // 生成临时ID存储（用于后续管理）
        const tempId = Date.now() + Math.random();
        this._coinNodes.set(tempId, node);
    }

    private _animateLocalPush(dt: number) {
        if (!this.pushNode) return;

        this._ensurePushBaseCache();

        if (!this._localPushConfigured) {
            const currentZ = this.pushNode.position.z;
            const travel = 2.5;
            this._localPushZMin = currentZ - travel;
            this._localPushZMax = currentZ + travel;
            this._localPushConfigured = true;
        }

        let nextZ = this.pushNode.position.z + this._localPushSpeed * dt * this._localPushDir;
        if (nextZ >= this._localPushZMax) {
            nextZ = this._localPushZMax;
            this._localPushDir = -1;
        }
        else if (nextZ <= this._localPushZMin) {
            nextZ = this._localPushZMin;
            this._localPushDir = 1;
        }

        // 本地模式不需要对服务器坐标做偏移
        this._syncPushNodeZ(nextZ, /*applyMapping*/ false);
    }

    /** 将服务器坐标映射到客户端推台坐标 */
    private _mapServerZToClient(serverZ: number): number {
        const sMin = GameConfig.SERVER_PUSH_MIN_Z ?? -13.97;
        const sMax = GameConfig.SERVER_PUSH_MAX_Z ?? -10.5;
        // 目标映射区间：使用前移的可视推台范围，让金币更靠前
        const cMin = GameConfig.CLIENT_PUSH_MIN_Z ?? GameConfig.PUSH_MIN_POS_Z ?? -8.8;
        const cMax = GameConfig.CLIENT_PUSH_MAX_Z ?? GameConfig.PUSH_MAX_POS_Z ?? -6.0;
        const sRange = sMax - sMin;
        const cRange = cMax - cMin;
        if (Math.abs(sRange) < 1e-5) return serverZ;
        const tClamped = Math.max(0, Math.min(1, (serverZ - sMin) / sRange));
        return cMin + tClamped * cRange + (GameConfig.SERVER_TO_CLIENT_Z_BIAS ?? 0);
    }

    // ========== 清理 ==========

    onDestroy() {
        this._coinNodes.forEach(node => node.destroy());
        this._coinNodes.clear();
        this._predictedCoins.forEach(node => node.destroy());
        this._predictedCoins.clear();
        this._coinPool.clear();
        this._coinPrefabPromise = null;
        this.coinPrefab = null;
    }

    /**
     * 捕获推台初始位置，便于同步可视节点
     */
    private _ensurePushBaseCache() {
        if (!this.pushNode) return;

        const pushNodeChanged = this._cachedPushNode !== this.pushNode;
        const visualNodeChanged = this._cachedVisualNode !== this.pushVisualNode;

        if (!this._pushBaseCaptured || pushNodeChanged || visualNodeChanged) {
            this._cachedPushNode = this.pushNode;
            this._cachedVisualNode = this.pushVisualNode;
            this._pushNodeBaseZ = this.pushNode.position.z;

            if (this.pushVisualNode) {
                this.pushNode.getWorldPosition(this._tempWorldPosA);
                this.pushVisualNode.getWorldPosition(this._tempWorldPosB);
                Vec3.subtract(this._pushVisualOffset, this._tempWorldPosB, this._tempWorldPosA);
                console.log(
                    `[PhysicsComp] captured push visual offset (world) = (${this._pushVisualOffset.x.toFixed(3)}, ${this._pushVisualOffset.y.toFixed(3)}, ${this._pushVisualOffset.z.toFixed(3)})`
                );

                if (GameConfig.PUSH_VISUAL_OFFSET_X !== undefined) this._pushVisualOffset.x = GameConfig.PUSH_VISUAL_OFFSET_X;
                if (GameConfig.PUSH_VISUAL_OFFSET_Y !== undefined) this._pushVisualOffset.y = GameConfig.PUSH_VISUAL_OFFSET_Y;
                if (GameConfig.PUSH_VISUAL_OFFSET_Z !== undefined) this._pushVisualOffset.z = GameConfig.PUSH_VISUAL_OFFSET_Z;

                Vec3.add(this._tempWorldPosB, this._tempWorldPosA, this._pushVisualOffset);
                this.pushVisualNode.setWorldPosition(this._tempWorldPosB);
                this._pushVisualBaseZ = this._tempWorldPosB.z;
                console.log(
                    `[PhysicsComp] pushModel aligned to (${this._tempWorldPosB.x.toFixed(3)}, ${this._tempWorldPosB.y.toFixed(3)}, ${this._tempWorldPosB.z.toFixed(3)})`
                );
            } else {
                this._pushVisualBaseZ = this._pushNodeBaseZ + (GameConfig.PUSH_VISUAL_OFFSET_Z ?? 0);
                this._pushVisualOffset.set(
                    GameConfig.PUSH_VISUAL_OFFSET_X ?? 0,
                    GameConfig.PUSH_VISUAL_OFFSET_Y ?? 0,
                    GameConfig.PUSH_VISUAL_OFFSET_Z ?? 0
                );
            }

            this._pushBaseCaptured = true;

            // 新节点时重新计算本地推台动画范围
            this._localPushConfigured = false;
        }
    }

    /**
     * 同步推台及可视节点的 Z 轴位移
     */
    private _syncPushNodeZ(targetZ: number, applyMapping: boolean = true) {
        if (!this.pushNode) return;

        this._ensurePushBaseCache();

        const pos = this.pushNode.position;
        const mappedZ = applyMapping ? this._mapServerZToClient(targetZ) : targetZ;
        this.pushNode.setPosition(pos.x, pos.y, mappedZ);

        if (this.pushVisualNode) {
            this.pushNode.getWorldPosition(this._tempWorldPosA);
            Vec3.add(this._tempWorldPosB, this._tempWorldPosA, this._pushVisualOffset);
            this.pushVisualNode.setWorldPosition(this._tempWorldPosB);
        }
    }
}
