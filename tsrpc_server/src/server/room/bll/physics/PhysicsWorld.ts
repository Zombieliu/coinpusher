import RAPIER from '@dimforge/rapier3d-compat';

/**
 * 服务端物理世界 (基于 Rapier 3D)
 * 负责推币机的核心物理模拟
 */
export class PhysicsWorld {
    world!: RAPIER.World;
    
    // 刚体引用
    pushPlatformBody!: RAPIER.RigidBody;
    
    // 金币管理
    // Map<CoinID, RigidBody>
    coins: Map<number, RAPIER.RigidBody> = new Map();
    coinHandleToId: Map<number, number> = new Map(); // handle -> coinId

    // ========== 增量同步（Delta Compression） ==========
    /** 上一帧的硬币状态（用于增量计算） */
    private _lastCoinStates: Map<number, { p: { x: number, y: number, z: number }, r: { x: number, y: number, z: number, w: number } }> = new Map();

    /** 位置变化阈值（米） - 小于此值视为未变化 */
    private readonly POSITION_DELTA_THRESHOLD = 0.05; // 5cm

    /** 旋转变化阈值（四元数点积） - 大于此值视为未变化 */
    private readonly ROTATION_DELTA_THRESHOLD = 0.99; // 约8度

    // ID 生成器
    private _coinIdCounter: number = 1;

    // 游戏参数 (与 GameConfig 保持一致)
    readonly PUSH_MIN_Z = -8.8;
    readonly PUSH_MAX_Z = -6.0;
    readonly PUSH_SPEED = 1.5;
    readonly GOLD_RADIUS = 0.5;
    readonly GOLD_HEIGHT = 0.1; // 假设厚度

    // 推板状态
    private _pushDir: number = 1; // 1: 向 Z 轴正方向 (推), -1: 收回

    constructor() {
        // 注意：必须确保 RAPIER.init() 在实例化之前已调用
        let gravity = { x: 0.0, y: -20.0, z: 0.0 }; // 加大重力以增加稳定性
        this.world = new RAPIER.World(gravity);
        
        this._initStaticEnvironment();
        this._initPushPlatform();
    }

    /** 必须在使用前调用一次 */
    static async waitForInit() {
        await RAPIER.init();
    }

    /** 初始化静态环境（地板、墙壁） */
    private _initStaticEnvironment() {
        // 1. 主地板 (台面)
        // 范围大约 X[-5, 5], Z[-10, 0]
        const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, -5);
        const groundBody = this.world.createRigidBody(groundDesc);
        // 创建一个大盒子作为地板
        const groundCollider = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0)
            .setFriction(0.5)
            .setRestitution(0.2);
        this.world.createCollider(groundCollider, groundBody);

        // 2. 收集区漏斗/边界 (简单处理：只建左右墙和后墙，前方开放给掉落)
        this._createWall(6.0, 2.0, -5.0, 0.5, 2.0, 10.0); // 右墙
        this._createWall(-6.0, 2.0, -5.0, 0.5, 2.0, 10.0); // 左墙
        this._createWall(0.0, 2.0, -11.0, 10.0, 2.0, 0.5); // 后墙 (里侧)
        
        // 前方 (Z > -0.5) 是掉落区，不做墙壁
    }

    private _createWall(x: number, y: number, z: number, hx: number, hy: number, hz: number) {
        const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
        const body = this.world.createRigidBody(bodyDesc);
        const collider = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.1);
        this.world.createCollider(collider, body);
    }

    /** 初始化推板 */
    private _initPushPlatform() {
        // 初始位置
        const startZ = this.PUSH_MIN_Z;
        // 推板是一个运动学刚体 (Kinematic PositionBased)，由代码控制位置，但会推开动态刚体
        const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(0, 0.5, startZ); // 略高于地面
        
        this.pushPlatformBody = this.world.createRigidBody(bodyDesc);

        // 推板形状：宽大扁平的盒子
        // 宽度 8 (X[-4, 4]), 高度 0.4, 深度 2
        const collider = RAPIER.ColliderDesc.cuboid(4.0, 0.4, 2.0)
            .setFriction(0.3)
            .setRestitution(0.1);
        
        this.world.createCollider(collider, this.pushPlatformBody);
    }

    /** 更新推板位置 */
    private _updatePushPlatform(dt: number) {
        const curPos = this.pushPlatformBody.translation();
        let newZ = curPos.z + this.PUSH_SPEED * this._pushDir * dt;

        // 边界检查与反向
        if (newZ >= this.PUSH_MAX_Z) {
            newZ = this.PUSH_MAX_Z;
            this._pushDir = -1;
        } else if (newZ <= this.PUSH_MIN_Z) {
            newZ = this.PUSH_MIN_Z;
            this._pushDir = 1;
        }

        this.pushPlatformBody.setNextKinematicTranslation({ x: curPos.x, y: curPos.y, z: newZ });
    }

    /** 生成金币 */
    dropCoin(x: number, z: number = -6.0): number {
        const coinId = this._coinIdCounter++;
        
        // 动态刚体
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, 10.0, z) // 从高空 Y=10 掉落
            .setCcdEnabled(true); // 开启连续碰撞检测，防止穿透

        const body = this.world.createRigidBody(bodyDesc);

        // 圆柱体 (Cylinder) 近似金币
        const collider = RAPIER.ColliderDesc.cylinder(this.GOLD_HEIGHT / 2, this.GOLD_RADIUS)
            .setFriction(0.4)
            .setRestitution(0.3)
            .setDensity(5.0); // 设置密度，让它沉重一些

        this.world.createCollider(collider, body);

        this.coins.set(coinId, body);
        this.coinHandleToId.set(body.handle, coinId);

        return coinId;
    }

    /** 物理步进（增量同步优化版） */
    step(dt: number): { coins: any[], collected: number[], removed: number[] } {
        // 1. 更新运动学物体
        this._updatePushPlatform(dt);

        // 2. 物理模拟
        this.world.step();

        // 3. 收集状态和事件
        const coinStates: any[] = [];      // 有变化的硬币
        const collectedIds: number[] = [];  // 被收集的硬币
        const removedIds: number[] = [];    // 消失的硬币（包括收集的）
        const idsToRemove: number[] = [];

        const currentFrameIds = new Set<number>();

        this.coins.forEach((body, id) => {
            currentFrameIds.add(id);

            const pos = body.translation();
            const rot = body.rotation();

            // 检查是否掉落到底部 (Y < -5) -> 销毁
            if (pos.y < -5.0) {
                idsToRemove.push(id);
                removedIds.push(id);

                // 检查是否在收集区
                // Z > -0.5 且 X 在 [-1.5, 1.5] 之间 (大致范围，需微调)
                if (pos.z > -0.5 && Math.abs(pos.x) < 1.5) {
                    collectedIds.push(id);
                }
            } else {
                // 还在台面上，检查是否需要同步
                const currentState = {
                    p: { x: Number(pos.x.toFixed(2)), y: Number(pos.y.toFixed(2)), z: Number(pos.z.toFixed(2)) },
                    r: { x: Number(rot.x.toFixed(3)), y: Number(rot.y.toFixed(3)), z: Number(rot.z.toFixed(3)), w: Number(rot.w.toFixed(3)) }
                };

                // 增量同步判断
                if (this._shouldSyncCoin(id, currentState)) {
                    coinStates.push({
                        id: id,
                        ...currentState
                    });

                    // 更新上一帧状态
                    this._lastCoinStates.set(id, currentState);
                }
            }
        });

        // 检测消失的硬币（上一帧存在，这一帧不存在）
        this._lastCoinStates.forEach((_, id) => {
            if (!currentFrameIds.has(id)) {
                removedIds.push(id);
            }
        });

        // 清理已掉落的刚体
        idsToRemove.forEach(id => {
            const body = this.coins.get(id);
            if (body) {
                this.world.removeRigidBody(body);
                this.coinHandleToId.delete(body.handle);
                this.coins.delete(id);
                this._lastCoinStates.delete(id); // 清理上一帧状态
            }
        });

        return {
            coins: coinStates,        // 只包含有变化的硬币
            collected: collectedIds,
            removed: removedIds       // 新增：被移除的硬币ID列表
        };
    }

    /**
     * 判断硬币是否需要同步（增量同步核心逻辑）
     * @param id 硬币ID
     * @param currentState 当前状态
     * @returns true = 需要同步, false = 跳过（未变化）
     */
    private _shouldSyncCoin(
        id: number,
        currentState: { p: { x: number, y: number, z: number }, r: { x: number, y: number, z: number, w: number } }
    ): boolean {
        const lastState = this._lastCoinStates.get(id);

        // 如果是新硬币，必须同步
        if (!lastState) {
            return true;
        }

        // 位置变化检测
        const dx = currentState.p.x - lastState.p.x;
        const dy = currentState.p.y - lastState.p.y;
        const dz = currentState.p.z - lastState.p.z;
        const positionDelta = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (positionDelta > this.POSITION_DELTA_THRESHOLD) {
            return true; // 位置变化超过阈值
        }

        // 旋转变化检测（四元数点积）
        const q1 = lastState.r;
        const q2 = currentState.r;
        const dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
        const absDot = Math.abs(dot);

        if (absDot < this.ROTATION_DELTA_THRESHOLD) {
            return true; // 旋转变化超过阈值
        }

        // 位置和旋转都未明显变化，跳过同步
        return false;
    }
}
