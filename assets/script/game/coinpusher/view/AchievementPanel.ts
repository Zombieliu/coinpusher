/**
 * @file AchievementPanel.ts
 * @description 成就面板（简化版）
 *
 * @module coinpusher/view
 *
 * @author UI Team
 * @created 2025-11-28
 *
 * @description
 * AchievementPanel 显示玩家的成就列表
 * 当前为简化版本，后续可扩展
 */

import { _decorator, Label, Node } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UICallbacks } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { UIView } from "../../common/ui/UIView";
import { GameConfig } from "../model/GameConfig";

const { ccclass, property } = _decorator;

/**
 * 成就面板
 *
 * @class AchievementPanel
 * @extends UIView
 */
@ccclass("AchievementPanel")
export class AchievementPanel extends UIView {
    /** 成就列表显示区域 */
    @property(Label)
    lbAchievements: Label = null!;

    /** 关闭按钮节点 */
    @property(Node)
    btnClose: Node = null!;

    onAdded(params: any, callbacks: UICallbacks): void {
        console.log('[AchievementPanel] onAdded()');
    }

    onOpen(fromUI: number, ...args: any[]): void {
        console.log('[AchievementPanel] onOpen()');
        this._initUI();
    }

    private _initUI() {
        if (this.lbAchievements) {
            this.lbAchievements.string = '成就系统开发中...\n\n敬请期待！';
        }
    }

    /**
     * 关闭按钮
     */
    public onBtnClose() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        this.close();
    }
}
