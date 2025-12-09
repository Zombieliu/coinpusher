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
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { RoomService } from "../../network/RoomService";

console.log("[DEBUG] PhysicsComp.ts loaded, about to register");
@ecs.register("PhysicsComp")
export class PhysicsComp extends ecs.Comp {
    // ========== 场景节点引用 ==========
    /** 推动台节点 */
    pushNode: Node | null = null;

    /** 金币父节点 */
    coinParent: Node | null = null;

    /** 金币预制体 */
    coinPrefab: Prefab | null = null;

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

    // ========== 插值参数 ==========
    /** 渲染延迟（tick数） - 保持2个快照的缓冲，确保插值平滑 */
    private readonly INTERPOLATION_DELAY = 2;

    /** 服务器 tick 间隔 (ms) - 对应 30Hz */
    private readonly SERVER_TICK_INTERVAL_MS = 33;

    // ========== Temp 对象（避免 GC） ==========
    private _tempVec3 = new Vec3();
    private _tempQuat = new Quat();

    // ========== 生命周期 ==========

    reset() {
        this.pushNode = null;
        this.coinParent = null;
        this.coinPrefab = null;
        this.roomService = null;
        this._coinNodes.clear();
        this._predictedCoins.clear();
        this._coinPool.clear();
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

        // 如果没有金币预制体，跳过渲染
        if (!this.coinPrefab) {
            return;
        }

        const snapshots = this.roomService.snapshots;

        // 处理首帧快照：如果只有一个快照，直接渲染（不插值）
        if (snapshots.length === 1) {
            const snapshot = snapshots[0];
            this._renderSnapshot(snapshot);
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
                this._renderSnapshot(snapshots[snapshots.length - 1]);
            }
            return;
        }

        // 3. 插值推板位置
        this._interpolatePushPlatform(prev, next, alpha);

        // 4. 插值金币
        this._interpolateCoins(prev, next, alpha);
    }

    /**
     * 直接渲染单个快照（无插值）
     * @param snapshot 快照数据
     */
    private _renderSnapshot(snapshot: any) {
        if (!this.pushNode || !this.coinParent || !this.coinPrefab) return;

        // 渲染推板
        const pushZ = snapshot.data?.pushZ ?? snapshot.data?.push_z ?? 0;
        const pos = this.pushNode.position;
        this.pushNode.setPosition(pos.x, pos.y, pushZ);

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

        const pos = this.pushNode.position;
        this.pushNode.setPosition(pos.x, pos.y, currentZ);
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

    /**
     * 更新或创建金币节点
     */
    private _updateOrCreateCoin(
        coinId: number,
        pos: { x: number; y: number; z: number } | Vec3,
        rot: { x: number; y: number; z: number; w: number } | Quat
    ) {
        let node = this._coinNodes.get(coinId);

        if (!node) {
            // 创建新金币
            if (this._coinPool.size() > 0) {
                node = this._coinPool.get()!;
            } else {
                node = instantiate(this.coinPrefab!);
            }

            node.parent = this.coinParent;
            this._coinNodes.set(coinId, node);
        }

        // 更新位置和旋转
        if (pos instanceof Vec3) {
            node.setPosition(pos);
        } else {
            node.setPosition(pos.x, pos.y, pos.z);
        }

        if (rot instanceof Quat) {
            node.setRotation(rot);
        } else {
            node.setRotation(rot.x, rot.y, rot.z, rot.w);
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

        // 设置位置
        node.setPosition(pos);

        // 设置旋转（如果有）
        if (eul) {
            node.setRotationFromEuler(eul.x, eul.y, eul.z);
        }

        node.parent = this.coinParent;

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

        // 设置初始位置（从高处掉落）
        node.setPosition(x, 10.0, -6.0);
        node.parent = this.coinParent;

        this._predictedCoins.set(coinId, node);

        return node;
    }

    // ========== 本地模式（无服务器） ==========

    private _localModeInitialized = false;

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
            // console.log('[PhysicsComp] ⏳ Waiting for coinPrefab to load...');
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

        // 这里可以添加本地推手动画等逻辑
        // 暂时保持静态
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

        node.setPosition(x, y, z);
        node.parent = this.coinParent;

        // 生成临时ID存储（用于后续管理）
        const tempId = Date.now() + Math.random();
        this._coinNodes.set(tempId, node);
    }

    // ========== 清理 ==========

    onDestroy() {
        this._coinNodes.forEach(node => node.destroy());
        this._coinNodes.clear();
        this._predictedCoins.forEach(node => node.destroy());
        this._predictedCoins.clear();
        this._coinPool.clear();
    }
}
