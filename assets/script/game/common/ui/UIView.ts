
import { _decorator } from "cc";
import { GameComponent } from "../../../../../extensions/oops-plugin-framework/assets/module/common/GameComponent";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";

const { ccclass } = _decorator;

/**
 * 游戏 UI 视图基类
 * 继承自 GameComponent，提供通用的 UI 功能
 */
@ccclass("UIView")
export class UIView extends GameComponent {
    /**
     * 关闭当前界面
     */
    close() {
        oops.gui.removeByNode(this.node);
    }
}
