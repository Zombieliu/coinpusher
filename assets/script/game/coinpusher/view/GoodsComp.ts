/**
 * @file GoodsComp.ts
 * @description 金币和礼物组件
 *
 * @module coinpusher/view
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 挂载在每个金币和礼物节点上的组件：
 * - 初始化金币属性（位置、旋转、价值）
 * - 碰撞检测和音效播放
 * - 分帧检查索引
 * - 是否为礼物标识
 */

import { _decorator, Component, Vec3, RigidBody, BoxCollider, Collider, ICollisionEvent, CCInteger } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { GameConfig } from "../model/GameConfig";

const { ccclass, property } = _decorator;

@ccclass("GoodsComp")
export class GoodsComp extends Component {
    // ========== 金币属性 ==========
    /** 金币价值（普通金币为1，特殊金币可能更高） */
    @property({ type: CCInteger, tooltip: '金币价值' })
    goldValue: number = 1;

    /** 分帧检查索引（用于性能优化） */
    goodsIndex: number = 0;

    /** 是否为礼物 */
    isPresent: boolean = false;

    /** 是否可以添加金币（用于标记是否已经被收集） */
    addGold: number = 1;

    /** 是否启用碰撞事件（掉落时播放音效） */
    private _isOnColliderEvent: boolean = false;

    /** 是否已经播放过碰撞音效 */
    private _hasPlayedCollisionSound: boolean = false;

    // ========== 生命周期 ==========

    onLoad() {
        // 注册碰撞事件
        const collider = this.node.getComponent(Collider);
        if (collider) {
            collider.on('onCollisionEnter', this._onCollisionEnter, this);
        }
    }

    // ========== 初始化方法 ==========

    /**
     * 初始化金币
     * @param isOnColliderEvent 是否启用碰撞音效
     * @param goodsIndex 分帧检查索引
     * @param pos 位置
     * @param eul 旋转（可选）
     */
    initGoods(isOnColliderEvent: boolean, goodsIndex: number, pos: Vec3, eul?: Vec3) {
        this._isOnColliderEvent = isOnColliderEvent;
        this.goodsIndex = goodsIndex;
        this._hasPlayedCollisionSound = false;
        this.addGold = 1; // 重置为可收集状态

        // 设置位置
        this.node.setPosition(pos);

        // 设置旋转
        if (eul) {
            this.node.setRotationFromEuler(eul);
        }

        // 激活节点
        this.node.active = true;
    }

    // ========== 碰撞检测 ==========

    /**
     * 碰撞进入事件
     * @param event 碰撞事件
     */
    private _onCollisionEnter(event: ICollisionEvent) {
        // 只在启用碰撞事件且未播放过音效时播放
        if (this._isOnColliderEvent && !this._hasPlayedCollisionSound) {
            const otherNode = event.otherCollider.node;

            // 检查碰撞的是否为地板或墙面
            if (otherNode.name === GameConfig.WALL_NAME_DOWN_FLOOR ||
                otherNode.name === GameConfig.WALL_NAME) {
                // 播放金币掉落音效
                this._playDropSound();
                this._hasPlayedCollisionSound = true;
            }
        }
    }

    /**
     * 播放掉落音效
     */
    private _playDropSound() {
        if (this.isPresent) {
            // 礼物掉落音效
            oops.audio.playEffect(GameConfig.AUDIO_PATH.GET_PRESENT);
        } else {
            // 金币掉落音效（随机选择）
            const dropSounds = GameConfig.AUDIO_PATH.GOLD_DROP;
            const randomSound = dropSounds[Math.floor(oops.random.getRandomFloat(0, 1) * dropSounds.length)];
            oops.audio.playEffect(randomSound);
        }
    }

    // ========== 金币收集 ==========

    /**
     * 收集金币
     */
    getGoods() {
        if (this.addGold === 0) {
            return; // 已经被收集过
        }

        console.log(`[GoodsComp] Coin collected, value: ${this.goldValue}`);

        // 播放收集音效（随机选择）
        if (this.isPresent) {
            oops.audio.playEffect(GameConfig.AUDIO_PATH.GET_PRESENT);
        } else {
            const getSounds = GameConfig.AUDIO_PATH.GET_GOLD;
            const randomSound = getSounds[Math.floor(oops.random.getRandomFloat(0, 1) * getSounds.length)];
            oops.audio.playEffect(randomSound);
        }

        // 触发收集事件
        oops.message.dispatchEvent(GameConfig.EVENT_LIST.COIN_COLLECTED, this.goldValue);

        // 标记为已收集
        this.addGold = 0;

        // TODO: 播放收集特效
        // this._playCollectEffect();
    }

    /**
     * 回收到对象池
     */
    putPoolGoods() {
        // 重置状态
        this.addGold = 1;
        this._hasPlayedCollisionSound = false;

        // 隐藏节点
        this.node.active = false;

        // TODO: 这里应该通知 PhysicsComp 回收到对象池
        // 目前由 PhysicsComp 直接调用 recycleCoin()
    }

    // ========== 清理 ==========

    onDestroy() {
        const collider = this.node.getComponent(Collider);
        if (collider) {
            collider.off("onCollisionEnter", this._onCollisionEnter, this);
        }
    }
}

// ========== 游戏配置扩展 ==========
// 添加墙面名称常量到 GameConfig

declare module "../model/GameConfig" {
    interface GameConfigType {
        WALL_NAME_DOWN_FLOOR: string;
        WALL_NAME: string;
    }
}

// 扩展 GameConfig
Object.assign(GameConfig, {
    WALL_NAME_DOWN_FLOOR: "wallDownFloor",
    WALL_NAME: 'wall',
});
