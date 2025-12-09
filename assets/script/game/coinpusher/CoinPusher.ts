/**
 * @file CoinPusher.ts
 * @description 推金币游戏主 Entity
 *
 * @module coinpusher
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 推金币游戏的核心实体，使用 ECS 架构组织：
 * - Model Layer: 数据存储（CoinModelComp, GameStateComp）
 * - BLL Layer: 业务逻辑（PhysicsComp, RewardComp, JackpotComp）
 * - View Layer: 视图管理（GameViewComp）
 *
 * @example
 * ```typescript
 * // 在 Main.ts 中创建实体
 * import { smc } from './game/common/ecs/SingletonModuleComp';
 * import { CoinPusher } from "./game/coinpusher/CoinPusher";
 *
 * protected run() {
 *     smc.coinPusher = ecs.getEntity<CoinPusher>(CoinPusher);
 * }
 *
 * // 使用实体
 * const coinPusher = smc.coinPusher;
 *
 * // 开始游戏
 * coinPusher.startGame();
 *
 * // 创建金币
 * coinPusher.createCoin(new Vec3(0, 10, -8));
 *
 * // 触发大奖
 * coinPusher.triggerJackpot(100);
 *
 * // 查询链上金币
 * const gold = await coinPusher.queryGold();
 * ```
 */

import { Node, Vec3 } from "cc";
import { CCEntity } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCEntity";
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

// Model Layer
import { CoinModelComp } from "./model/CoinModelComp";
import { GameStateComp } from "./model/GameStateComp";

// BLL Layer
import { PhysicsComp } from "./bll/PhysicsComp";
import { RewardComp } from "./bll/RewardComp";
import { JackpotComp } from "./bll/JackpotComp";
import { EffectComp } from "./bll/EffectComp";

// View Layer
import { GameViewComp } from "./view/GameViewComp";

/**
 * 推金币游戏主 Entity
 *
 * @description
 * 整合所有组件，提供统一的对外接口。
 * 使用 OOPS ECS 架构，组件分为三层：
 * - Model: 数据存储
 * - BLL: 业务逻辑
 * - View: 视图管理
 */
@ecs.register("CoinPusher")
export class CoinPusher extends CCEntity {
    // ========== Model Layer（数据层）==========

    /** 金币数据模型 */
    CoinModel!: CoinModelComp;

    /** 游戏状态模型 */
    GameState!: GameStateComp;

    // ========== BLL Layer（业务逻辑层）==========

    /** 物理系统 */
    Physics!: PhysicsComp;

    /** 奖励系统 */
    Reward!: RewardComp;

    /** 大奖系统 */
    Jackpot!: JackpotComp;

    /** 特效系统 */
    Effect!: EffectComp;

    // ========== View Layer（视图层）==========

    /** 游戏视图 */
    GameView!: GameViewComp;

    // ========== 生命周期 ==========

    protected init() {
        console.log('[CoinPusher] ========== Entity initializing ==========');

        // 初始化常驻组件（按照依赖顺序添加）
        this.addComponents<ecs.Comp>(
            // Model Layer（数据层，无依赖）
            CoinModelComp,
            GameStateComp,

            // BLL Layer（业务逻辑层，依赖 Model）
            PhysicsComp,
            RewardComp,
            JackpotComp,
            EffectComp,

            // View Layer（视图层，依赖 BLL）
            GameViewComp
        );

        console.log('[CoinPusher] Components added, verifying...');
        console.log('[CoinPusher] - CoinModel:', !!this.CoinModel);
        console.log('[CoinPusher] - GameState:', !!this.GameState);
        console.log('[CoinPusher] - Physics:', !!this.Physics);
        console.log('[CoinPusher] - Reward:', !!this.Reward);
        console.log('[CoinPusher] - Jackpot:', !!this.Jackpot);
        console.log('[CoinPusher] - Effect:', !!this.Effect);
        console.log('[CoinPusher] - GameView:', !!this.GameView);
        console.log('[CoinPusher] ✅ Entity initialized with all components');
    }

    // ========== 对外接口 ==========

    /**
     * 初始化场景
     * @param sceneRoot 游戏场景根节点
     */
    initScene(sceneRoot: Node) {
        console.log('[CoinPusher] ========== initScene CALLED ==========');
        console.log('[CoinPusher] sceneRoot:', sceneRoot?.name);
        console.log('[CoinPusher] GameView component:', !!this.GameView);

        if (!this.GameView) {
            console.error('[CoinPusher] ❌ GameView component is null!');
            return;
        }

        console.log('[CoinPusher] Calling GameView.initSceneNodes...');
        this.GameView.initSceneNodes(sceneRoot);
        console.log('[CoinPusher] ✅ GameView.initSceneNodes returned');
    }

    /**
     * 开始游戏
     */
    startGame() {
        console.log('[CoinPusher] Starting game...');
        this.GameState.startGame();

        // 播放摄像机动画
        this.GameView.playCameraAnimation(() => {
            console.log('[CoinPusher] Game started, camera animation finished');
        });
    }

    /**
     * 暂停游戏
     */
    pauseGame() {
        console.log('[CoinPusher] Pausing game...');
        this.GameState.pauseGame();
    }

    /**
     * 恢复游戏
     */
    resumeGame() {
        console.log('[CoinPusher] Resuming game...');
        this.GameState.resumeGame();
    }

    /**
     * 创建金币
     * @param pos 金币位置
     * @param eul 金币旋转（可选）
     */
    createCoin(pos: Vec3, eul?: Vec3) {
        this.Physics.createCoin(pos, eul);
    }

    /**
     * 触发大奖
     * @param coinCount 大奖金币数量
     */
    triggerJackpot(coinCount: number) {
        console.log(`[CoinPusher] Triggering jackpot with ${coinCount} coins`);
        this.Jackpot.trigger(coinCount);
    }

    /**
     * 查询链上金币
     * @returns 金币数量，查询失败返回 null
     */
    async queryGold(): Promise<number | null> {
        console.log('[CoinPusher] Querying gold from chain...');
        return await this.Reward.queryChainGold();
    }

    /**
     * 收集金币（手动调用，通常由事件触发）
     * @param coinValue 金币价值
     */
    async collectCoin(coinValue: number) {
        await this.Reward.collectCoin(coinValue);
    }

    /**
     * 消耗金币
     * @param amount 消耗数量
     */
    async consumeGold(amount: number) {
        await this.Reward.consumeGold(amount);
    }

    /**
     * 强制同步金币到链上
     */
    async syncToChain() {
        console.log('[CoinPusher] Force syncing to chain...');
        await this.Reward.forceSyncToChain();
    }

    /**
     * 获取当前金币总数（本地）
     */
    get totalGold(): number {
        return this.CoinModel.totalGold;
    }

    /**
     * 获取台面上的金币数量
     */
    get coinsOnTable(): number {
        return this.CoinModel.coinsOnTable;
    }

    /**
     * 游戏是否正在运行
     */
    get isPlaying(): boolean {
        return this.GameState.isPlaying;
    }

    /**
     * 游戏是否暂停
     */
    get isPaused(): boolean {
        return this.GameState.isPaused;
    }

    /**
     * 是否正在掉落大奖
     */
    get isJackpotActive(): boolean {
        return this.Jackpot.isActive;
    }

    /**
     * 游戏时长（秒）
     */
    get gameDuration(): number {
        return this.GameState.gameDuration;
    }

    // ========== 清理 ==========

    destroy(): void {
        console.log('[CoinPusher] Entity destroying...');

        // 强制同步金币到链
        this.syncToChain();

        super.destroy();
    }
}

// 导出系统（用于 ECS 架构）
export { EcsCoinPusherSystem } from "./CoinPusherSystem";
