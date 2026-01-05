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
import { AutoLoginService } from "../service/AutoLoginService";
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
                if (this.ent) {
                    this.ent.remove(LoadingViewComp);
                }
                break;
        }
    }

    /** 加载资源 */
    private async loadRes() {
        this.data.progress = 0;
        await this.loadCustom();
        await this.loadGameRes();
    }

    /** 加载游戏本地JSON数据（自定义内容） */
    private loadCustom() {
        // 加载游戏本地JSON数据的多语言提示文本
        this.data.prompt = "Loading config...";

        return new Promise(async (resolve, reject) => {
            await JsonUtil.loadDir();
            resolve(null);
        });
    }

    /** 加载初始游戏内容资源 */
    private async loadGameRes() {
        const gameLabel = "Loading game assets";
        const groups: Array<{ path: string; label: string; type: "dir" | "asset"; }> = [
            { path: "prefab/ui/game", label: `${gameLabel} (Game UI)`, type: "dir" },
            { path: "prefab/ui/offlineReward", label: `${gameLabel} (Offline UI)`, type: "dir" },
            { path: "prefab/ui/setting", label: `${gameLabel} (Setting UI)`, type: "dir" },
            { path: "prefab/model/coin", label: `${gameLabel} (Coin Prefab)`, type: "asset" },
            { path: "prefab/model/numFont", label: `${gameLabel} (Number Font)`, type: "dir" },
        ];

        const weight = 1 / (groups.length || 1);
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            this.data.prompt = group.label;
            const start = i * weight;
            if (group.type === "asset") {
                await this.loadAssetWithProgress(group.path, start, weight);
            }
            else {
                await this.loadDirWithProgress(group.path, start, weight);
            }
        }

        try {
            this.data.prompt = oops.language.getLangByID("loading_load_player");
            // 确保网络模块存在
            if (!smc.net) {
                const { CommonNet } = await import("../../common/SingletonModuleComp");
                smc.net = new CommonNet();
            }
            const autoLogin = new AutoLoginService();
            await autoLogin.run((msg) => {
                if (this.data) {
                    this.data.prompt = msg;
                }
            });
        }
        catch (error: any) {
            console.error("[LoadingViewComp] Failed to auto login", error);
            await this.openLoginScreen(`Login failed: ${error?.message ?? error}`);
        }
    }

    private loadDirWithProgress(path: string, start: number, weight: number) {
        return new Promise<void>((resolve, reject) => {
            oops.res.loadDir(path, (finished: number, total: number) => {
                const local = total > 0 ? finished / total : 1;
                this.updateProgress(start + local * weight);
            }, (err: Error | null) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.updateProgress(start + weight);
                resolve();
            });
        });
    }

    private loadAssetWithProgress(path: string, start: number, weight: number) {
        return new Promise<void>((resolve, reject) => {
            oops.res.load(path, (err: Error | null) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.updateProgress(start + weight);
                resolve();
            });
        });
    }

    private updateProgress(value: number) {
        if (!this.data) {
            return;
        }

        const clamped = Math.min(1, Math.max(0, value));
        this.data.finished = Math.floor(clamped * 100);
        this.data.total = 100;
        this.data.progress = (clamped * 100).toFixed(2);
    }

    private async openLoginScreen(message?: string) {
        if (this.data && message) {
            this.data.prompt = message;
        }
        await oops.gui.open(UIID.Login);
        if (this.ent) {
            this.ent.remove(LoadingViewComp);
        }
    }
}
