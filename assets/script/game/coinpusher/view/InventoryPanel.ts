/**
 * @file InventoryPanel.ts
 * @description 背包/物品面板（简化版）
 *
 * @module coinpusher/view
 *
 * @author UI Team
 * @created 2025-11-28
 *
 * @description
 * InventoryPanel 显示玩家拥有的礼物和道具
 * 当前为简化版本，后续可扩展
 */

import { _decorator, Label, Node } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UICallbacks } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { UIView } from "../../common/ui/UIView";
import { GameConfig } from "../model/GameConfig";

const { ccclass, property } = _decorator;

/**
 * 背包面板
 *
 * @class InventoryPanel
 * @extends UIView
 */
@ccclass("InventoryPanel")
export class InventoryPanel extends UIView {
    /** 背包列表显示区域 */
    @property(Label)
    lbInventory: Label = null!;

    /** 关闭按钮节点 */
    @property(Node)
    btnClose: Node = null!;

    onAdded(params: any, callbacks: UICallbacks): void {
        console.log('[InventoryPanel] onAdded()');
    }

    onOpen(fromUI: number, ...args: any[]): void {
        console.log('[InventoryPanel] onOpen()');
        this._initUI();
    }

    private _initUI() {
        if (this.lbInventory) {
            this.lbInventory.string = '背包系统开发中...\n\n敬请期待！';
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
