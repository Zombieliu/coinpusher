/*
 * @Author: dgflash
 * @Date: 2021-11-11 17:45:23
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-01 13:49:35
 */
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { CCEntity } from "../../../../extensions/oops-plugin-framework/assets/module/common/CCEntity";
import { UIID } from "../common/config/GameUIConfig";
import { GameEvent } from "../common/config/GameEvent";
import { InitResComp, InitResSystem } from "./bll/InitRes";
import { InitializeEvent } from "./InitializeEvent";

/**
 * 游戏进入初始化模块
 * 1、热更新
 * 2、加载默认资源
 */
@ecs.register("Initialize")
export class Initialize extends CCEntity {
    protected init() {
        // 初始化游戏公共资源
        this.add(InitResComp);
    }

    /**
     * 推金币登录流程（单机版本直接进入游戏）
     */
    login(username: string, serverUrl: string) {
        console.log(`[Initialize] Mock login for ${username} -> ${serverUrl}`);
        if (oops.gui.get(UIID.Login)) {
            oops.gui.remove(UIID.Login);
        }
        oops.gui.open(UIID.Game).catch(err => {
            console.error('[Initialize] Failed to open Game UI', err);
        });
        oops.message.dispatchEvent(GameEvent.LoginSuccess);
        oops.message.dispatchEvent(InitializeEvent.Logined);
    }
}

export class EcsInitializeSystem extends ecs.System {
    constructor() {
        super();

        this.add(new InitResSystem());
    }
}
