/**
 * @file JackpotPanel.ts
 * @description Jackpot 大奖触发弹窗
 *
 * @module coinpusher/view
 *
 * @author UI Team
 * @created 2025-11-28
 *
 * @description
 * JackpotPanel 在触发 Jackpot 时显示，展示奖励金币数量
 */

import { _decorator, Label, Node } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UICallbacks } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { UIView } from "../../common/ui/UIView";
import { GameConfig } from "../model/GameConfig";

const { ccclass, property } = _decorator;

/**
 * Jackpot 弹窗
 *
 * @class JackpotPanel
 * @extends UIView
 */
@ccclass("JackpotPanel")
export class JackpotPanel extends UIView {
    /** 金币数量显示 */
    @property(Label)
    lbCoinCount: Label = null!;

    /** 确认按钮节点 */
    @property(Node)
    btnConfirm: Node = null!;

    private _coinCount: number = 0;

    onAdded(params: any, callbacks: UICallbacks): void {
        console.log('[JackpotPanel] onAdded with params:', params);
        if (params && params.coinCount) {
            this._coinCount = params.coinCount;
        }
    }

    onOpen(fromUI: number, ...args: any[]): void {
        console.log('[JackpotPanel] onOpen()');
        this._initUI();
    }

    private _initUI() {
        if (this.lbCoinCount) {
            this.lbCoinCount.string = this._coinCount.toString();
        }

        // 播放 Jackpot 音效
        oops.audio.playEffect(GameConfig.AUDIO_PATH.JACKPOT);
    }

    /**
     * 确认按钮
     */
    public onBtnConfirm() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        this.close();
    }
}
