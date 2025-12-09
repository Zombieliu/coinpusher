/**
 * @file SimpleCoinPusherLogin.ts
 * @description 推金币游戏简单登录界面
 *
 * 用于单机/本地测试，不需要服务器验证
 */

import { _decorator, Component } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UIID } from "../../common/config/GameUIConfig";
import { GameEvent } from "../../common/config/GameEvent";

const { ccclass } = _decorator;

@ccclass('SimpleCoinPusherLogin')
export class SimpleCoinPusherLogin extends Component {

    onLoad() {
        console.log('[SimpleCoinPusherLogin] Login screen loaded');
    }

    start() {
        // 自动登录（单机游戏不需要真正的登录）
        console.log('[SimpleCoinPusherLogin] Auto-login for single player game');

        // 延迟一下，让玩家看到登录界面
        setTimeout(() => {
            this.onLoginSuccess();
        }, 500);
    }

    /** 点击开始游戏按钮（可以在编辑器中绑定到按钮） */
    onStartGameClick() {
        console.log('[SimpleCoinPusherLogin] Start game clicked');
        this.onLoginSuccess();
    }

    /** 登录成功 */
    private onLoginSuccess() {
        console.log('[SimpleCoinPusherLogin] Login success, opening game UI');

        // 关闭登录界面
        oops.gui.remove(UIID.Login);

        // 打开游戏主界面
        oops.gui.open(UIID.Game);

        // 触发登录成功事件（其他系统可能需要监听）
        oops.message.dispatchEvent(GameEvent.LoginSuccess);
    }
}
