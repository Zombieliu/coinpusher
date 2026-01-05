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
            oops.gui.toast('Health check failed');
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

        // 适配当前主机，刷新 NetworkManager 端点（docker/局域网）
        const resolved = NetworkConfig.resolvedEndpoints;
        NetworkManager.instance.init({
            gateUrl: resolved.gateUrl,
            matchUrl: resolved.matchUrl
        });

        const username = (this.eb_name.string?.trim() || NAMES[NAMES.length * Math.random() | 0]);

        const selection = this._getSelectedServer();
        if (selection) {
            GameServerConfig.match = `${selection.protocol}://${selection.rawHost}/`;
        } else {
            console.warn('[LoginViewComp] No specific server selected, using NetworkConfig defaults');
        }

        // 根据当前访问主机适配网关/匹配地址（docker/局域网）
        const resolved2 = NetworkConfig.resolvedEndpoints;
        GameServerConfig.match = GameServerConfig.match || resolved2.matchUrl || NetworkConfig.endpoints.matchUrl || "";
        NetworkConfig.overrideEndpoints({
            gateUrl: resolved2.gateUrl,
            matchUrl: resolved2.matchUrl
        });

        this._isLoggingIn = true;
        try {
            const gateRes = await NetworkManager.instance.gate.login(username);
            oops.storage.set('USER_ID', gateRes.userId);
            // 将服务器返回的 token 存为 SSO_TOKEN，供 Match/Room 请求使用
            if (gateRes.token) {
                oops.storage.set('SSO_TOKEN', gateRes.token);
            }
            const matchUrl = this._resolveMatchUrl(gateRes.matchUrl);
            if (!matchUrl) {
                throw new Error('Match server address is empty');
            }
            console.log('[LoginViewComp] Using match:', matchUrl);

            await NetworkManager.instance.match.initClient(matchUrl);
            const matchRes = await NetworkManager.instance.match.startMatch(gateRes.token);

            const connected = await NetworkManager.instance.room.connect(matchRes.serverUrl);
            if (!connected) {
                throw new Error('Unable to connect to room server');
            }

            await NetworkManager.instance.room.joinRoom(matchRes.roomId, gateRes.userId);

            if (smc.coinPusher?.Physics) {
                smc.coinPusher.Physics.roomService = NetworkManager.instance.room;
                console.log('[LoginViewComp] ✓ RoomService attached to PhysicsComp');
            } else {
                console.warn('[LoginViewComp] PhysicsComp not ready when attaching RoomService');
            }

            if (smc.coinPusher) {
                const gold = gateRes.gold ?? smc.coinPusher.CoinModel.totalGold;
                smc.coinPusher.CoinModel.totalGold = gold;
                oops.storage.setGlobalData('lastGold', gold);
                oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, gold);
            } else {
                // 兜底：先存储，等场景初始化时再同步
                const gold = gateRes.gold ?? 0;
                oops.storage.setGlobalData('lastGold', gold);
                console.warn('[LoginViewComp] CoinPusher entity not ready when syncing gold, stored lastGold:', gold);
            }

            if (gateRes.offlineReward > 0) {
                console.log(
                    '[LoginViewComp] Offline reward available but popup disabled temporarily:',
                    gateRes.offlineReward
                );
                // oops.gui.open(UIID.OfflineReward, { gold: gateRes.offlineReward });
            }

            oops.storage.set("lastUsername", username);
            oops.storage.set('hasPasskeyLogin', true);

            smc.initialize.login(username, selection?.rawHost ?? "");
            // 主游戏界面改为在摄像机动画结束后打开（参见 CoinPusher.startGame）
        } catch (error: any) {
            console.error('[LoginViewComp] Login failed:', error);
            oops.gui.toast(`Login failed: ${error?.message ?? error}`);
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
        const fallback = NetworkConfig.resolvedEndpoints.matchUrl ?? NetworkConfig.endpoints.matchUrl;
        if (!url) {
            return fallback;
        }

        try {
            const parsed = new URL(url);
            if (this._isLoopbackHost(parsed.hostname)) {
                return fallback ?? url;
            }
            return url;
        } catch (error) {
            console.warn('[LoginViewComp] Invalid matchUrl received:', url, error);
            return fallback ?? url;
        }
    }

    private _isLoopbackHost(host: string): boolean {
        return host === 'localhost' || host === '::1' || host.startsWith('127.') || host === '0.0.0.0';
    }
}
