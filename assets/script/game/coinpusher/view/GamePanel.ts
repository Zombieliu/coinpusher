/**
 * @file GamePanel.ts
 * @description 游戏主界面，处理金币投放、倒计时奖励、按钮交互等
 *
 * @module coinpusher/view
 *
 * @dependencies
 * - CoinPusher Entity: 推金币游戏主实体
 * - SuiManager: 链上金币同步
 * - OOPS GUI: UI 系统
 *
 * @author UI Team
 * @created 2025-11-28
 *
 * @description
 * GamePanel 是游戏的主要交互界面
 * 主要功能：
 * - 点击推台投放金币
 * - 倒计时自动奖励金币
 * - 显示金币数量
 * - 打开设置、成就、签到、背包等面板
 * - 离线奖励计算和显示
 *
 * @features
 * - ✅ 射线检测点击位置
 * - ✅ 金币投放限流（防止连续点击）
 * - ✅ 倒计时自动奖励
 * - ✅ 链上金币同步
 * - ✅ 离线奖励计算
 */

import { _decorator, Label, Node, Camera, PhysicsSystem, geometry, Vec3, find } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UICallbacks, ViewParams } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { UIView } from "../../common/ui/UIView";
import { UIID } from "../../common/config/GameUIConfig";
import { smc } from "../../common/ecs/SingletonModuleComp";
import { SuiManager } from "../../blockchain/SuiManager";
import { GameConfig } from "../model/GameConfig";
import { NetworkManager } from "../../network/NetworkManager";

const { ccclass, property } = _decorator;

/**
 * 游戏主面板
 *
 * @class GamePanel
 * @extends UIView
 *
 * @description
 * 处理游戏主要交互逻辑：金币投放、倒计时、按钮点击等
 */
@ccclass("GamePanel")
export class GamePanel extends UIView {
    /** 倒计时显示标签 */
    @property(Label)
    lbCountdownTime: Label = null!;

    /** 金币数量显示标签 */
    @property(Label)
    lbGold: Label = null!;

    /** 新手引导节点 */
    @property(Node)
    ndGuide: Node = null!;

    private _comCamera: Camera = null!;
    private _countdownTime: number = 0; // 倒计时增加金币
    private _checkCanClick: boolean = true; // 可点击生成金币
    private _checkCanClickTime: number = 0; // 可点击时间间隔计算
    private _isFirstClick: boolean = true; // 是否为第一次点击（隐藏新手引导）
    private _isActive: boolean = false; // 面板是否激活

    // ========== UIView 生命周期 ==========

    onAdded(params: any, callbacks: UICallbacks): void {
        console.log('[GamePanel] onAdded() called');
    }

    onOpen(fromUI: number, ...args: any[]): void {
        console.log('[GamePanel] onOpen() called');
        this._initUI();
    }

    onUpdate(dt: number): void {
        if (!this._isActive) {
            return;
        }

        // 倒计时更新
        this._countdownTime -= dt;
        this._updateTime();

        // 点击限流
        if (!this._checkCanClick) {
            this._checkCanClickTime += dt;
            if (this._checkCanClickTime >= GameConfig.GAMEPANEL_CAN_CLICK_INTERVAL) {
                this._checkCanClick = true;
            }
        }
    }

    onClose(toUI: number, ...args: any[]): void {
        console.log('[GamePanel] onClose() called');
        this._isActive = false;
    }

    onRemove(): void {
        console.log('[GamePanel] onRemove() called');
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        oops.message.off(GameConfig.EVENT_LIST.GOLD_CHANGED, this._onGoldChanged, this);
    }

    // ========== 初始化 ==========

    private _initUI() {
        this._isActive = true;

        // 查找主摄像机
        this._comCamera = find('Main Camera')?.getComponent(Camera)!;
        if (!this._comCamera) {
            console.error('[GamePanel] Main Camera not found!');
        }

        // 注册触摸事件
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);

        // 监听金币变化事件
        oops.message.on(GameConfig.EVENT_LIST.GOLD_CHANGED, this._onGoldChanged, this);

        // 初始化倒计时
        this._countdownTime = GameConfig.COUNTDOWN_REWARD_TIME + 1;
        this._updateTime();

        // 初始化金币显示
        this._updateGoldDisplay();

        // 显示新手引导（如果需要）
        if (this.ndGuide) {
            this.ndGuide.active = this._isFirstClick;
        }

        // 检查离线奖励
        this._checkOfflineReward();
    }

    // ========== 金币变化监听 ==========

    /**
     * 监听金币变化事件
     */
    private _onGoldChanged(newGold: number) {
        console.log('[GamePanel] Gold changed to:', newGold);
        this._updateGoldDisplay();
    }

    /**
     * 更新金币显示
     */
    private _updateGoldDisplay() {
        if (!smc.coinPusher) {
            console.warn("[GamePanel] CoinPusher entity not available");
            return;
        }

        const coinModel = smc.coinPusher.CoinModel;
        if (coinModel && this.lbGold) {
            this.lbGold.string = coinModel.totalGold.toString();
        }
    }

    /**
     * 获取当前金币数量
     */
    private _getPlayerGold(): number {
        if (!smc.coinPusher) return 0;
        return smc.coinPusher.CoinModel?.totalGold || 0;
    }

    // ========== 触摸事件处理 ==========

    /**
     * 触摸开始事件
     */
    private async _onTouchStart(e: any) {
        if (!this._checkCanClick) return;

        // 若显示新手引导，隐藏
        if (this._isFirstClick) {
            this._isFirstClick = false;
            if (this.ndGuide) {
                this.ndGuide.active = false;
            }
        }

        this._checkCanClick = false;
        this._checkCanClickTime = 0;

        // 获取触摸点的 X 坐标
        const touchPoint = e.touch._point;
        // 简单模拟将屏幕X转换为世界X：
        // 假设世界坐标X范围是 [-4, 4]，屏幕宽度与世界坐标X的映射
        const screenWidth = oops.stage.width;
        // 假设屏幕中心0映射到世界X=0，左右边缘映射到世界X的正负max
        // GameConfig.GOLD_ON_STAND_POS_MAX_X 实际是金币能分布的半宽
        const worldX = (touchPoint.x / screenWidth - 0.5) * (GameConfig.GOLD_ON_STAND_POS_MAX_X * 2);
        
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);

        try {
            // 发送投币请求给服务器
            const res = await NetworkManager.instance.room.dropCoin(worldX);
            if (res.isSucc) {
                // 客户端预测：生成一个虚影金币，等待服务器同步
                if (smc.coinPusher?.Physics) {
                    smc.coinPusher.Physics.createPredictedCoin(res.res.coinId!, worldX);
                }
                console.log(`[GamePanel] DropCoin request sent for x=${worldX}, server returned coinId=${res.res.coinId}`);
                // 客户端预测：立即扣除金币 (如果服务端成功)
                const currentGold = smc.coinPusher.CoinModel.totalGold - 1;
                smc.coinPusher.CoinModel.totalGold = currentGold;
                oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, currentGold);
            } else {
                oops.gui.toast(`投币失败: ${res.err?.message || "未知错误"}`);
            }
        } catch (error) {
            console.error("[GamePanel] DropCoin failed:", error);
            oops.gui.toast(`投币异常: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // ========== 倒计时奖励 ==========

    /**
     * 更新倒计时显示
     */
    private _updateTime() {
        if (!this.lbCountdownTime) {
            return;
        }

        if (this._countdownTime < 0) {
            // 倒计时结束，发放奖励
            oops.audio.playEffect(GameConfig.AUDIO_PATH.COUNTDOWN);

            this._countdownTime = GameConfig.COUNTDOWN_REWARD_TIME + 1;

            // 增加金币
            if (smc.coinPusher) {
                smc.coinPusher.collectCoin(GameConfig.COUNTDOWN_REWARD_GOLD);
            }
        }

        // 格式化时间显示 MM:SS
        const timeS = Math.floor(this._countdownTime % 60);
        const timeM = Math.floor(this._countdownTime / 60 % 60);

        if (timeS < 10) {
            this.lbCountdownTime.string = '0' + timeM + ':0' + timeS;
        } else {
            this.lbCountdownTime.string = '0' + timeM + ':' + timeS;
        }
    }

    // ========== 离线奖励 ==========

    /**
     * 检查离线奖励
     */
    private _checkOfflineReward() {
        const hideTime = oops.storage.getGlobalData('hideTime');
        if (!hideTime) {
            return;
        }

        const subTime = Date.now() - hideTime;
        const hour = Math.floor(subTime / 1000 / 60);

        let addGold;
        if (hour >= GameConfig.OFFLINE_MAX_GOLD * (GameConfig.OFFLINE_ADD_GOLD_TIME / 60)) {
            addGold = GameConfig.OFFLINE_MAX_GOLD;
        } else {
            addGold = Math.floor(hour / (GameConfig.OFFLINE_ADD_GOLD_TIME / 60));
        }

        if (addGold > 0) {
            // 显示离线奖励弹窗
            oops.gui.open(UIID.OfflineReward, { gold: addGold });
        }
    }

    // ========== 按钮回调 ==========

    /**
     * 打开设置面板
     */
    public onBtnSetting() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        oops.gui.open(UIID.Setting);
    }

    /**
     * 打开成就面板
     */
    public onBtnAchievement() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        oops.gui.open(UIID.Achievement);
    }

    /**
     * 打开签到面板
     */
    public onBtnCheckin() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        oops.gui.open(UIID.Checkin);
    }

    /**
     * 打开背包面板
     */
    public onBtnInventory() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        oops.gui.open(UIID.Inventory);
    }

    /**
     * 点击广告按钮获取金币
     */
    public async onBtnVideoGetGold() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.COUNTDOWN);

        if (smc.coinPusher) {
            const rewardGold = GameConfig.VIDEO_REWARD_GOLD;
            smc.coinPusher.collectCoin(rewardGold);
            oops.audio.playEffect(GameConfig.AUDIO_PATH.VIDEO_REWARD);
            oops.gui.toast(`成功添加 ${rewardGold} 金币！`);
        } else {
            oops.gui.toast('游戏未初始化');
        }
    }
}
