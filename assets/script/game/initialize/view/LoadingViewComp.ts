/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-29 13:37:08
 */
import { _decorator, sys } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { JsonUtil } from "../../../../../extensions/oops-plugin-framework/assets/core/utils/JsonUtil";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CCViewVM } from "../../../../../extensions/oops-plugin-framework/assets/module/common/CCViewVM";
import { GameEvent } from "../../common/config/GameEvent";
import { UIID } from "../../common/config/GameUIConfig";
import { smc } from "../../common/ecs/SingletonModuleComp";
import { Initialize } from "../Initialize";

const { ccclass, property } = _decorator;

/** 游戏资源加载 */
@ccclass("LoadingViewComp")
@ecs.register("LoadingView", false)
export class LoadingViewComp extends CCViewVM<Initialize> {
    /** VM 组件绑定数据 */
    data: any = {
        /** 加载资源当前进度 */
        finished: 0,
        /** 加载资源最大进度 */
        total: 0,
        /** 加载资源进度比例值 */
        progress: "0",
        /** 加载流程中提示文本 */
        prompt: ""
    };

    private progress: number = 0;

    reset(): void {
        setTimeout(() => {
            // 关闭加载界面
            oops.gui.remove(UIID.Loading);

            // 推金币游戏：直接打开游戏主界面（单机游戏不需要登录）
            console.log("[LoadingViewComp] Opening Game UI (skip login for single player)");
            oops.gui.open(UIID.Game);
        }, 500);
    }

    start() {
        if (!sys.isNative) {
            this.enter();
        }
    }

    enter() {
        this.addEvent();
        this.loadRes();
    }

    private addEvent() {
        this.on(GameEvent.LoginSuccess, this.onHandler, this);
    }

    private onHandler(event: string, args: any) {
        switch (event) {
            case GameEvent.LoginSuccess:
                // 加载流程结束，移除加载提示界面
                this.ent.remove(LoadingViewComp);
                break;
        }
    }

    /** 加载资源 */
    private async loadRes() {
        this.data.progress = 0;
        await this.loadCustom();
        this.loadGameRes();
    }

    /** 加载游戏本地JSON数据（自定义内容） */
    private loadCustom() {
        // 加载游戏本地JSON数据的多语言提示文本
        this.data.prompt = oops.language.getLangByID("loading_load_json");

        return new Promise(async (resolve, reject) => {
            await JsonUtil.loadDir();
            resolve(null);
        });
    }

    /** 加载初始游戏内容资源 */
    private loadGameRes() {
        // 加载初始游戏内容资源的多语言提示文本
        this.data.prompt = oops.language.getLangByID("loading_load_game");

        oops.res.loadDir("game", this.onProgressCallback.bind(this), this.onCompleteCallback.bind(this));
    }

    /** 加载进度事件 */
    private onProgressCallback(finished: number, total: number, item: any) {
        this.data.finished = finished;
        this.data.total = total;

        var progress = finished / total;
        if (progress > this.progress) {
            this.progress = progress;
            this.data.progress = (progress * 100).toFixed(2);
        }
    }

    /** 加载完成事件 */
    private onCompleteCallback() {
        // 获取用户信息的多语言提示文本
        this.data.prompt = oops.language.getLangByID("loading_load_player");

        // 推金币游戏：直接触发登录成功事件，打开游戏界面
        console.log("[LoadingViewComp] Resource loading complete, opening game UI");
        oops.message.dispatchEvent(GameEvent.LoginSuccess);
    }
}