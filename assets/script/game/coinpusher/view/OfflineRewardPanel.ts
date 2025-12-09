/**
 * @file OfflineRewardPanel.ts
 * @description 离线奖励弹窗
 *
 * @module coinpusher/view
 *
 * @author UI Team
 * @created 2025-11-28
 *
 * @description
 * OfflineRewardPanel 在玩家离线一段时间后返回时显示，展示离线期间获得的金币奖励
 */

import { _decorator, Label } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UICallbacks } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { UIView } from "../../common/ui/UIView";
import { smc } from "../../common/ecs/SingletonModuleComp";
import { GameConfig } from "../model/GameConfig";

const { ccclass, property } = _decorator;

/**
 * 离线奖励弹窗
 *
 * @class OfflineRewardPanel
 * @extends UIView
 */
@ccclass("OfflineRewardPanel")
export class OfflineRewardPanel extends UIView {
    /** 奖励金币数量显示 */
    @property(Label)
    lbGold: Label = null!;

    private _gold: number = 0;

    onAdded(params: any, callbacks: UICallbacks): void {
        console.log('[OfflineRewardPanel] onAdded with params:', params);
        if (params && params.gold) {
            this._gold = params.gold;
        }
    }

    onOpen(fromUI: number, ...args: any[]): void {
        console.log('[OfflineRewardPanel] onOpen()');
        this._initUI();
    }

    private _initUI() {
        if (this.lbGold) {
            this.lbGold.string = `+${this._gold}`;
        }
    }

    /**
     * 领取奖励按钮
     */
    public onBtnClaim() {
        const { GameConfig } = require('../model/GameConfig');
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);

        // 增加金币到玩家账户
        if (smc.coinPusher) {
            // 使用 collectCoin，这样会走交易队列和链上同步
            smc.coinPusher.collectCoin(this._gold);
        }

        // 显示成功提示
        oops.gui.toast(`成功领取 ${this._gold} 金币！`);

        // 关闭弹窗
        this.close();
    }
}
