/*
 * @Author: dgflash
 * @Date: 2022-06-24 09:55:51
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-20 10:29:54
 */
import { _decorator, EditBox, EventTouch, instantiate, Label, Node, Toggle, ToggleContainer } from "cc";
import { CCViewVM } from "../../../../../extensions/oops-plugin-framework/assets/module/common/CCViewVM";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { ShareConfig } from "../../../tsrpc/models/ShareConfig";
import { GameServerConfig } from "../../common/config/GameServerConfig";
import { UIID } from "../../common/config/GameUIConfig";
import { smc } from "../../common/SingletonModuleComp";
import { Initialize } from "../Initialize";
import { InitializeEvent } from "../InitializeEvent";
import { NetworkManager } from "../../network/NetworkManager";
import { GameConfig } from "../../coinpusher/model/GameConfig";
import { NetworkConfig } from "../../config/NetworkConfig";

const { ccclass, property } = _decorator;

const NAMES = ["oops", 'framework', 'moba', 'guide', 'game', 'aprg', 'slg', 'crpg', 'rpg', 'rts'];

/** 帐号登录界面 */
@ccclass('LoginViewComp')
@ecs.register("LoginView", false)
export class LoginViewComp extends CCViewVM<Initialize> {
    @property(EditBox)
    eb_name: EditBox = null!;

    @property(Node)
    tg_area: Node = null!;

    @property(Node)
    toggle: Node = null!;

    /** 防止重复发起登录 */
    private _isLoggingIn = false;

    /** 视图层逻辑代码分离演示 */
    onLoad() {
        this.on(InitializeEvent.Logined, this.onHandler, this);
    }

    start() {
        this.eb_name.string = NAMES[NAMES.length * Math.random() | 0];
        this.checkServerHealth();
    }

    private async checkServerHealth() {
        try {
            const res = await smc.net.hcGate.callApi('Health', {});
            if (res.isSucc) {
                console.log('[LoginViewComp] Health status:', res.res.status);
                await this.showGameArea();
            } else {
                oops.gui.toast(res.err.message);
            }
        } catch (err: any) {
            console.error('[LoginViewComp] Health check failed', err);
            oops.gui.toast('服务器健康检查失败');
        }
    }

    /** 获取区服信息 */
    async showGameArea() {
        const gateModel = smc.initialize.GateModel ?? (smc.initialize.GateModel = { area: [] } as any);
        var ret = await smc.net.hcGate.callApi(`GameArea`, {});
        if (ret.isSucc) {
            gateModel.area = ret.res.area;

            this.toggle.removeFromParent();
            this.tg_area.removeAllChildren();

            const tc = this.tg_area.getComponent(ToggleContainer);
            const chainLabels = ['Sui', 'Solana'];
            const chainOptions = chainLabels.map((label, idx) => {
                return {
                    label,
                    server: ret.res.area[idx]?.server ?? ret.res.area[0]?.server ?? ''
                };
            }).filter(opt => !!opt.server);
            gateModel.chainOptions = chainOptions;

            chainOptions.forEach((opt, index) => {
                var node = instantiate(this.toggle);
                node.name = index.toString();
                node.parent = this.tg_area;
                const toggleComp = node.getComponent(Toggle);
                if (index === 0 && toggleComp) {
                    toggleComp.isChecked = true;
                }
                var lab = node.getChildByName("Label");
                lab.name = index.toString();
                lab.getComponent(Label).string = opt.label;
                lab.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                    var idx = parseInt(event.target.name);
                    tc.toggleItems[idx].isChecked = true;
                }, this);
            });
        }
        else {
            oops.gui.toast(ret.err.message);
        }
    }

    /** 登录 */
    async btnLogin() {
        if (this._isLoggingIn) {
            return;
        }

        const username = (this.eb_name.string?.trim() || NAMES[NAMES.length * Math.random() | 0]);

        const selection = this._getSelectedServer();
        if (selection) {
            GameServerConfig.match = `${selection.protocol}://${selection.rawHost}/`;
        } else {
            console.warn('[LoginViewComp] No specific server selected, using NetworkConfig defaults');
        }

        this._isLoggingIn = true;
        try {
            const gateRes = await NetworkManager.instance.gate.login(username);
            const matchUrl = this._resolveMatchUrl(gateRes.matchUrl);
            if (!matchUrl) {
                throw new Error('匹配服务器地址为空');
            }
            console.log('[LoginViewComp] Using match:', matchUrl);

            await NetworkManager.instance.match.initClient(matchUrl);
            const matchRes = await NetworkManager.instance.match.startMatch(gateRes.token);

            const connected = await NetworkManager.instance.room.connect(matchRes.serverUrl);
            if (!connected) {
                throw new Error('无法连接房间服务器');
            }

            if (smc.coinPusher) {
                const gold = gateRes.gold ?? smc.coinPusher.CoinModel.totalGold;
                smc.coinPusher.CoinModel.totalGold = gold;
                oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, gold);
            } else {
                console.warn('[LoginViewComp] CoinPusher entity not ready when syncing gold');
            }

            if (gateRes.offlineReward > 0) {
                oops.gui.open(UIID.OfflineReward, { gold: gateRes.offlineReward });
            }

            oops.storage.setGlobalData("lastUsername", username);
            oops.storage.setGlobalData('hasPasskeyLogin', true);

            smc.initialize.login(username, selection?.rawHost ?? "");
        } catch (error: any) {
            console.error('[LoginViewComp] Login failed:', error);
            oops.gui.toast(`登录失败：${error?.message ?? error}`);
        } finally {
            this._isLoggingIn = false;
        }
    }

    /** 全局消息逻辑处理 */
    private onHandler(event: string, args: any) {
        switch (event) {
            case InitializeEvent.Logined:
                if (oops.gui.get(UIID.Login)) {
                    oops.gui.remove(UIID.Login);
                }
                break;
        }
    }

    /** 视图对象通过 ecs.Entity.remove(ModuleViewComp) 删除组件是触发组件处理自定义释放逻辑 */
    reset() {
        this.node.destroy();
    }

    private _getSelectedServer(): { rawHost: string; fullUrl: string; protocol: string } | null {
        const gateModel = smc.initialize.GateModel ?? (smc.initialize.GateModel = { area: [] } as any);
        const selections = gateModel.chainOptions ?? gateModel.area ?? [];
        let rawHost = "";
        this.tg_area.children.forEach(n => {
            if (n.getComponent(Toggle).isChecked) {
                const idx = parseInt(n.name);
                rawHost = selections?.[idx]?.server ?? rawHost;
            }
        });

        if (!rawHost) {
            return null;
        }

        const protocol = ShareConfig.https ? "https" : "http";
        const normalized = rawHost.startsWith('http://') || rawHost.startsWith('https://')
            ? rawHost
            : `${protocol}://${rawHost}`;

        return {
            rawHost,
            fullUrl: normalized.replace(/\/+$/, ''),
            protocol
        };
    }

    private _resolveMatchUrl(url?: string): string | undefined {
        if (!url) {
            return NetworkConfig.endpoints.matchUrl;
        }

        try {
            const parsed = new URL(url);
            if (this._isLoopbackHost(parsed.hostname)) {
                return NetworkConfig.endpoints.matchUrl ?? url;
            }
            return url;
        } catch (error) {
            console.warn('[LoginViewComp] Invalid matchUrl received:', url, error);
            return NetworkConfig.endpoints.matchUrl ?? url;
        }
    }

    private _isLoopbackHost(host: string): boolean {
        return host === 'localhost' || host === '::1' || host.startsWith('127.') || host === '0.0.0.0';
    }
}
