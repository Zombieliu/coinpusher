/**
 * @file GameStateComp.ts
 * @description 游戏状态组件
 *
 * @module coinpusher/model
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 存储游戏运行状态：
 * - 当前游戏状态（未开始/游戏中/暂停/大奖触发中）
 * - 游戏时长
 * - 自动掉落设置
 */

import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

/** 游戏状态枚举 */
export enum GameState {
    NotStarted = 0,    // 未开始
    Playing,           // 游戏中
    Paused,            // 暂停
    JackpotTriggered,  // 大奖触发中
}

@ecs.register("GameStateComp")
export class GameStateComp extends ecs.Comp {
    /** 当前游戏状态 */
    currentState: GameState = GameState.NotStarted;

    /** 是否自动掉落金币（测试用） */
    autoDropCoin: boolean = false;

    /** 上次保存台面数据的时间 */
    lastSaveTime: number = 0;

    /** 游戏开始时间戳 */
    gameStartTime: number = 0;

    /** 游戏总时长（秒） */
    get gameDuration(): number {
        if (this.gameStartTime === 0) return 0;
        return (Date.now() - this.gameStartTime) / 1000;
    }

    /** 开始游戏 */
    startGame() {
        this.currentState = GameState.Playing;
        this.gameStartTime = Date.now();
        console.log("[GameStateComp] Game started");
    }

    /** 暂停游戏 */
    pauseGame() {
        this.currentState = GameState.Paused;
        console.log('[GameStateComp] Game paused');
    }

    /** 恢复游戏 */
    resumeGame() {
        this.currentState = GameState.Playing;
        console.log('[GameStateComp] Game resumed');
    }

    /** 是否在游戏中 */
    get isPlaying(): boolean {
        return this.currentState === GameState.Playing;
    }

    /** 是否暂停 */
    get isPaused(): boolean {
        return this.currentState === GameState.Paused;
    }
}
