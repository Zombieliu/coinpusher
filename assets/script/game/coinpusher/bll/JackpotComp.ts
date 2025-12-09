/**
 * @file JackpotComp.ts
 * @description 大奖系统组件
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 处理大奖触发和金币掉落：
 * - 触发大奖弹窗
 * - 金币缓慢掉落效果
 * - 大奖完成音效和特效
 */

import { Vec3 } from "cc";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UIID } from "../../common/config/GameUIConfig";
import { GameConfig } from "../model/GameConfig";
import { PhysicsComp } from "./PhysicsComp";
import { GameStateComp, GameState } from "../model/GameStateComp";
import { EffectComp } from "./EffectComp";

@ecs.register("JackpotComp")
export class JackpotComp extends ecs.Comp {
    // ========== 大奖状态 ==========
    /** 是否正在掉落大奖金币 */
    private _isActive: boolean = false;

    /** 剩余要掉落的金币数 */
    private _coinsRemaining: number = 0;

    /** 大奖掉落计时器 */
    private _dropTimer: number = 0;

    /** 总金币数（用于显示进度） */
    private _totalCoins: number = 0;

    // ========== 生命周期 ==========

    onInit() {
        console.log("[JackpotComp] Jackpot system initialized");

        // 监听大奖触发事件
        oops.message.on(GameConfig.EVENT_LIST.JACKPOT_TRIGGER, this._onJackpotTrigger, this);
    }

    // ========== 大奖触发 ==========

    /** 大奖触发事件处理 */
    private _onJackpotTrigger(coinCount: number) {
        this.trigger(coinCount);
    }

    /** 触发大奖 */
    trigger(coinCount: number) {
        if (this._isActive) {
            console.warn('[JackpotComp] Jackpot already active, ignoring new trigger');
            return;
        }

        console.log(`[JackpotComp] 🎉 Jackpot triggered! ${coinCount} coins incoming...`);

        // 播放大奖触发音效
        oops.audio.playEffect('jackpot_trigger');

        // 播放大奖触发特效
        const effectComp = this.ent.get(EffectComp);
        if (effectComp) {
            // 在屏幕中央播放大奖触发特效
            effectComp.playParticle('effect/prefab/tvShow', new Vec3(0, 0, 0), 1.0);
        }

        // 显示大奖弹窗
        oops.gui.open(UIID.Jackpot, { coinCount }, () => {
            // 弹窗关闭后，开始掉落金币
            console.log('[JackpotComp] Jackpot popup closed, starting coin drop...');
            this._startDrop(coinCount);
        });
    }

    /** 开始掉落金币 */
    private _startDrop(coinCount: number) {
        this._isActive = true;
        this._coinsRemaining = coinCount;
        this._totalCoins = coinCount;
        this._dropTimer = 0;

        // 更新游戏状态
        const gameState = this.ent.get(GameStateComp);
        if (gameState) {
            gameState.currentState = GameState.JackpotTriggered;
        }

        console.log(`[JackpotComp] Starting jackpot drop: ${coinCount} coins`);
    }

    // ========== 每帧更新 ==========

    update(dt: number) {
        if (!this._isActive || this._coinsRemaining <= 0) {
            return;
        }

        this._dropTimer += dt;

        // 每隔一定时间掉落一个金币
        if (this._dropTimer >= GameConfig.JACKPOT_DROP_INTERVAL) {
            this._dropTimer = 0;
            this._dropOneCoin();
            this._coinsRemaining--;

            // 触发进度更新事件（用于 UI 显示）
            const progress = 1 - (this._coinsRemaining / this._totalCoins);
            oops.message.dispatchEvent('jackpot_progress', progress);

            // 所有金币掉落完毕
            if (this._coinsRemaining <= 0) {
                this._finish();
            }
        }
    }

    /** 掉落一个金币 */
    private _dropOneCoin() {
        const physicsComp = this.ent.get(PhysicsComp);
        if (!physicsComp) {
            console.error('[JackpotComp] PhysicsComp not found');
            return;
        }

        // 在随机位置掉落金币
        const randomX = (oops.random.getRandomFloat(0, 1) - 0.5) * GameConfig.JACKPOT_DROP_AREA_X;
        const randomZ = (oops.random.getRandomFloat(0, 1) - 0.5) * GameConfig.JACKPOT_DROP_AREA_Z;
        const randomY = GameConfig.JACKPOT_DROP_BASE_Y + oops.random.getRandomFloat(0, 1) * GameConfig.JACKPOT_DROP_Y_RANDOM;

        const dropPos = new Vec3(randomX, randomY, randomZ);

        // 创建金币
        physicsComp.createCoin(dropPos);

        // 播放掉落音效（每隔几个金币播放一次，避免太频繁）
        if (this._coinsRemaining % 10 === 0) {
            oops.audio.playEffect('coin_drop');
        }
    }

    /** 大奖结束 */
    private _finish() {
        this._isActive = false;

        console.log('[JackpotComp] 🎉 Jackpot finished!');

        // 恢复游戏状态
        const gameState = this.ent.get(GameStateComp);
        if (gameState) {
            gameState.currentState = GameState.Playing;
        }

        // 播放完成音效
        oops.audio.playEffect('jackpot_finish');

        // 显示完成特效（庆祝礼花）
        const effectComp = this.ent.get(EffectComp);
        if (effectComp) {
            effectComp.playCelebrate(new Vec3(0, 5, 0), () => {
                console.log('[JackpotComp] Celebrate effect finished');
            });
        }

        // 触发完成事件
        oops.message.dispatchEvent('jackpot_finished', this._totalCoins);
    }

    // ========== 对外接口 ==========

    /** 是否正在掉落大奖 */
    get isActive(): boolean {
        return this._isActive;
    }

    /** 剩余金币数 */
    get coinsRemaining(): number {
        return this._coinsRemaining;
    }

    /** 总金币数 */
    get totalCoins(): number {
        return this._totalCoins;
    }

    /** 进度（0-1） */
    get progress(): number {
        if (this._totalCoins === 0) return 0;
        return 1 - (this._coinsRemaining / this._totalCoins);
    }

    // ========== 清理 ==========

    onDestroy() {
        console.log('[JackpotComp] Component destroyed');

        // 取消事件监听
        oops.message.off(GameConfig.EVENT_LIST.JACKPOT_TRIGGER, this._onJackpotTrigger, this);
    }
}
