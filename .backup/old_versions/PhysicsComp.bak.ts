/**
 * @file PhysicsComp.ts
 * @description 推金币物理系统组件
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 从 gold/gameManager.ts 迁移的物理系统逻辑：
 * - 推动台运动控制
 * - 金币创建和回收
 * - 金币状态检查（掉落、收集）
 * - 场景墙面刚体初始化
 * - 物理碰撞检测
 */

import { Node, Vec3, RigidBody, instantiate, Prefab, director, BoxCollider } from "cc";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameConfig } from "../model/GameConfig";
import { CoinModelComp } from "../model/CoinModelComp";
import { GameStateComp } from "../model/GameStateComp";
import { GoodsComp } from "../view/GoodsComp";

export class PhysicsComp extends ecs.Comp {
    // ========== 场景节点引用 ==========
    /** 推动台节点 */
    private _pushNode: Node | null = null;

    /** 金币父节点 */
    private _coinParent: Node | null = null;

    /** 场景根节点 */
    private _sceneRoot: Node | null = null;

    // ========== 物理系统状态 ==========
    /** 推动台线性速度 */
    private _linearVelocity: Vec3 = new Vec3(0, 0, GameConfig.PUSH_LINEAR_VELOCITY_Z);

    /** 金币检查帧索引 */
    private _checkGoodsIndex: number = 0;

    /** 金币预制体 */
    private _coinPrefab: Prefab | null = null;

    // ========== 生命周期 ==========

    onAdd() {
        console.log("[PhysicsComp] Component added");
    }

    onInit() {
        console.log('[PhysicsComp] Initializing physics system...');
        // 加载金币预制体
        this._loadCoinPrefab();
    }

    /** 加载金币预制体 */
    private async _loadCoinPrefab() {
        const coinModel = this.entity.get(CoinModelComp);
        if (!coinModel) return;

        try {
            this._coinPrefab = await oops.res.loadAsync(coinModel.coinPrefabPath, Prefab) as Prefab;
            console.log('[PhysicsComp] Coin prefab loaded');
        } catch (error) {
            console.error('[PhysicsComp] Failed to load coin prefab:', error);
        }
    }

    // ========== 场景初始化 ==========

    /** 设置场景节点引用 */
    setSceneNodes(sceneRoot: Node, pushNode: Node, coinParent: Node) {
        this._sceneRoot = sceneRoot;
        this._pushNode = pushNode;
        this._coinParent = coinParent;

        console.log('[PhysicsComp] Scene nodes set');

        // 初始化场景
        this._initScene();
    }

    /** 初始化场景 */
    private _initScene() {
        // 初始化推动台
        this._initPushPlatform();

        // 初始化场景墙面
        this._initSceneWalls();

        // 初始化台面金币
        this._initTableCoins();
    }

    /** 初始化推动台 */
    private _initPushPlatform() {
        if (!this._pushNode) return;

        // 设置推动台初始位置
        this._pushNode.setPosition(
            GameConfig.PUSH_INIT_POS_X,
            GameConfig.PUSH_INIT_POS_Y,
            GameConfig.PUSH_MIN_POS_Z
        );

        console.log('[PhysicsComp] Push platform initialized');
    }

    /** 初始化场景墙面刚体 */
    private _initSceneWalls() {
        if (!this._sceneRoot) return;

        // 创建墙面容器
        const wallBox = new Node('wallBox');
        this._sceneRoot.addChild(wallBox);

        // TODO: 从 gold/gameConstants.ts 迁移墙面碰撞盒数据
        // 这里需要添加所有墙面刚体和碰撞体
        // 参考 gameManager._createAllWallRigidBody()

        console.log('[PhysicsComp] Scene walls initialized');
    }

    /** 初始化台面金币 */
    private _initTableCoins() {
        // TODO: 从存档加载金币，或创建初始金币
        // 参考 gameManager._initGame() 和 _createInitCoin()

        // 简化版：直接创建一些初始金币
        this._createInitialCoins();
    }

    /** 创建初始金币（平铺在台面） */
    private _createInitialCoins() {
        if (!this._coinParent || !this._coinPrefab) return;

        let coinCount = 0;
        let x = 0;
        let z = GameConfig.GOLD_ON_STAND_POS_MIN_Z;
        const pos = new Vec3();
        const eul = new Vec3(0, 0, 0);

        // 平铺金币
        while (z < GameConfig.GOLD_ON_STAND_POS_MAX_Z) {
            if (x === 0) {
                pos.set(x, GameConfig.GOLD_ON_STAND_POS_Y, z);
                this.createCoin(pos, eul);
                coinCount++;
            } else {
                pos.set(x, GameConfig.GOLD_ON_STAND_POS_Y, z);
                this.createCoin(pos, eul);
                coinCount++;

                pos.set(-x, GameConfig.GOLD_ON_STAND_POS_Y, z);
                this.createCoin(pos, eul);
                coinCount++;
            }

            x += GameConfig.GOLD_SIZE;

            if (x > GameConfig.GOLD_ON_STAND_POS_MAX_X) {
                x = 0;
                z += GameConfig.GOLD_SIZE;
            }
        }

        console.log(`[PhysicsComp] Created ${coinCount} initial coins`);
    }

    // ========== 金币管理 ==========

    /** 创建金币 */
    createCoin(pos: Vec3, eul?: Vec3): Node | null {
        if (!this._coinParent || !this._coinPrefab) {
            console.warn('[PhysicsComp] Cannot create coin: missing parent or prefab');
            return null;
        }

        const coinModel = this.entity.get(CoinModelComp);
        if (!coinModel) return null;

        // 检查是否达到最大金币数
        if (coinModel.isMaxCoins) {
            console.warn('[PhysicsComp] Max coins reached');
            return null;
        }

        // 从对象池获取或创建新金币
        let coin: Node;
        if (coinModel.coinPool.length > 0) {
            coin = coinModel.coinPool.pop()!;
            coin.active = true;
        } else {
            coin = instantiate(this._coinPrefab);
        }

        // 添加到场景
        this._coinParent.addChild(coin);

        // 获取组件
        const rigidBody = coin.getComponent(RigidBody);
        const goodsComp = coin.getComponent(GoodsComp);

        // 重置物理状态
        if (rigidBody) {
            rigidBody.setLinearVelocity(Vec3.ZERO);
            rigidBody.setAngularVelocity(Vec3.ZERO);
            rigidBody.clearState();
            rigidBody.wakeUp();
        }

        // 分配检查帧索引
        this._assignGoodsIndex();

        // 初始化金币逻辑
        if (goodsComp) {
            // 是否启用碰撞事件
            const isOnColliderEvent = true;
            goodsComp.initGoods(isOnColliderEvent, this._checkGoodsIndex, pos, eul);
        } else {
            // 如果没有 GoodsComp，手动设置位置
            coin.setPosition(pos);
            if (eul) coin.setRotationFromEuler(eul);
        }

        // 更新数据
        coinModel.coinNodes.push(coin);
        coinModel.coinsOnTable++;

        return coin;
    }

    /** 分配金币检查帧索引 */
    private _assignGoodsIndex() {
        this._checkGoodsIndex++;
        if (this._checkGoodsIndex > GameConfig.GOLD_CHECK_MAX_FRAME) {
            this._checkGoodsIndex = 2;
        }
    }

    /** 回收金币到对象池 */
    recycleCoin(coin: Node) {
        const coinModel = this.entity.get(CoinModelComp);
        if (!coinModel) return;

        // 停止物理运动
        const rigidBody = coin.getComponent(RigidBody);
        if (rigidBody) {
            rigidBody.sleep();
        }

        // 重置业务状态
        const goodsComp = coin.getComponent(GoodsComp);
        if (goodsComp) {
            goodsComp.putPoolGoods();
        }

        // 隐藏并移除
        coin.active = false;
        coin.parent = null;

        // 加入对象池
        coinModel.coinPool.push(coin);
        coinModel.coinsOnTable--;

        // 从列表移除
        const index = coinModel.coinNodes.indexOf(coin);
        if (index > -1) {
            coinModel.coinNodes.splice(index, 1);
        }
    }

    /** 检查单个金币状态 */
    private _checkCoinState(coin: Node, frame: number): boolean {
        const pos = coin.position;

        // 性能优化：分帧检查
        const goodsComp = coin.getComponent(GoodsComp);
        if (goodsComp && frame % goodsComp.goodsIndex !== 0) {
            return false;
        }

        // 金币是否从台子上掉落
        if (pos.y >= GameConfig.GOODS_CHECK_OTHER_STATE) {
            return false; // 还在掉落中
        }

        // 金币掉出显示范围，需要销毁
        if (pos.y < GameConfig.GOODS_DESTROY_POS_Y) {
            console.log('[PhysicsComp] Coin fell out of bounds');
            return true; // 需要回收
        }

        // 金币进入可收集区域
        if (pos.y < GameConfig.GOODS_GET_MIN_POS_Y) {
            // 检查是否在收集区域内
            if (pos.x > -GameConfig.GOODS_GET_MIN_POS_X &&
                pos.x < GameConfig.GOODS_GET_MIN_POS_X &&
                pos.z > GameConfig.GOODS_GET_MIN_POS_Z &&
                pos.z < GameConfig.GOODS_GET_MAX_POS_Z) {
                // 收集金币
                this._collectCoin(coin);
                return true; // 需要回收
            } else {
                // 不在收集区域，金币无效
                console.log('[PhysicsComp] Coin fell outside collection area');
                // TODO: 播放无效音效
                // oops.audio.playEffect('invalid_gold');
                return true; // 需要回收
            }
        }

        return false; // 不需要回收
    }

    /** 收集金币 */
    private _collectCoin(coin: Node) {
        // 获取金币价值
        let coinValue = 1;
        const goodsComp = coin.getComponent(GoodsComp);
        if (goodsComp) {
            coinValue = goodsComp.goldValue;
            // 触发 GoodsComp 的收集逻辑（音效等）
            goodsComp.getGoods();
        } else {
            // 兜底音效
            oops.audio.playEffect('get_gold');
            // 兜底事件
            oops.message.dispatchEvent(GameConfig.EVENT_LIST.COIN_COLLECTED, coinValue);
        }
        
        console.log(`[PhysicsComp] Coin collected, value: ${coinValue}`);
    }

    // ========== 每帧更新 ==========

    update(dt: number) {
        const gameState = this.entity.get(GameStateComp);
        if (!gameState || !gameState.isPlaying) {
            return; // 游戏未开始或暂停
        }

        // 更新推动台运动
        this._updatePushPlatform();

        // 更新金币状态
        this._updateCoins();
    }

    /** 更新推动台运动 */
    private _updatePushPlatform() {
        if (!this._pushNode) return;

        const pushPos = this._pushNode.getPosition();

        // 推动台往返运动
        if (pushPos.z <= GameConfig.PUSH_MIN_POS_Z) {
            this._linearVelocity.set(0, 0, GameConfig.PUSH_LINEAR_VELOCITY_Z);
        } else if (pushPos.z >= GameConfig.PUSH_MAX_POS_Z) {
            this._linearVelocity.set(0, 0, -GameConfig.PUSH_LINEAR_VELOCITY_Z);
        }

        const rigidBody = this._pushNode.getComponent(RigidBody);
        if (rigidBody) {
            rigidBody.setLinearVelocity(this._linearVelocity);
        }
    }

    /** 更新所有金币 */
    private _updateCoins() {
        const coinModel = this.entity.get(CoinModelComp);
        if (!coinModel) return;

        const frame = director.getTotalFrames();

        // 遍历所有金币并检查状态
        for (let i = coinModel.coinNodes.length - 1; i >= 0; i--) {
            const coin = coinModel.coinNodes[i];

            // 检查金币是否需要回收
            if (this._checkCoinState(coin, frame)) {
                this.recycleCoin(coin);
            }
        }
    }

    // ========== 清理 ==========

    onDestroy() {
        console.log('[PhysicsComp] Component destroyed');
        this._coinPrefab = null;
        this._pushNode = null;
        this._coinParent = null;
        this._sceneRoot = null;
    }
}
