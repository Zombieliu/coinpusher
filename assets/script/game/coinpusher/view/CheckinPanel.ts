/**
 * @file CheckinPanel.ts
 * @description 每日签到面板（简化版）
 *
 * @module coinpusher/view
 *
 * @author UI Team
 * @created 2025-11-28
 *
 * @description
 * CheckinPanel 提供每日签到功能，领取签到奖励
 * 当前为简化版本，后续可扩展
 */

import { _decorator, Label, Node } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UICallbacks } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { UIView } from "../../common/ui/UIView";
import { smc } from "../../common/ecs/SingletonModuleComp";
import { GameConfig } from "../model/GameConfig";

const { ccclass, property } = _decorator;

/**
 * 签到面板
 *
 * @class CheckinPanel
 * @extends UIView
 */
@ccclass("CheckinPanel")
export class CheckinPanel extends UIView {
    /** 签到状态显示 */
    @property(Label)
    lbStatus: Label = null!;

    /** 签到按钮节点 */
    @property(Node)
    btnCheckin: Node = null!;

    /** 关闭按钮节点 */
    @property(Node)
    btnClose: Node = null!;

    private _canCheckin: boolean = true;

    onAdded(params: any, callbacks: UICallbacks): void {
        console.log('[CheckinPanel] onAdded()');
    }

    onOpen(fromUI: number, ...args: any[]): void {
        console.log('[CheckinPanel] onOpen()');
        this._initUI();
    }

    private _initUI() {
        // 检查今天是否已签到
        const lastCheckinDate = oops.storage.getGlobalData('lastCheckinDate');
        const today = new Date().toDateString();

        this._canCheckin = lastCheckinDate !== today;

        this._updateUI();
    }

    /**
     * 更新 UI 显示
     */
    private _updateUI() {
        if (this.lbStatus) {
            if (this._canCheckin) {
                this.lbStatus.string = `点击签到\n领取 ${GameConfig.CHECKIN_REWARD_GOLD} 金币！`;
            } else {
                this.lbStatus.string = '今日已签到\n明天再来吧！';
            }
        }

        // 更新按钮状态
        if (this.btnCheckin) {
            this.btnCheckin.active = this._canCheckin;
        }
    }

    /**
     * 签到按钮
     */
    public onBtnCheckin() {
        if (!this._canCheckin) {
            oops.gui.toast('今日已签到！');
            return;
        }

        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);

        // 发放签到奖励
        const rewardGold = GameConfig.CHECKIN_REWARD_GOLD;

        if (smc.coinPusher) {
            // 使用 collectCoin，通过服务端/链上同步
            smc.coinPusher.collectCoin(rewardGold);

            // 播放奖励音效
            oops.audio.playEffect(GameConfig.AUDIO_PATH.COUNTDOWN);
        } else {
            console.error('[CheckinPanel] CoinPusher entity not available');
            oops.gui.toast('游戏未初始化');
            return;
        }

        // 保存签到记录
        const today = new Date().toDateString();
        oops.storage.setGlobalData('lastCheckinDate', today);

        // 更新 UI
        this._canCheckin = false;
        this._updateUI();

        oops.gui.toast(`签到成功！获得 ${rewardGold} 金币`);
    }

    /**
     * 关闭按钮
     */
    public onBtnClose() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        this.close();
    }
}
