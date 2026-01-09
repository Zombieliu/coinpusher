import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { smc } from "../../common/ecs/SingletonModuleComp";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { GameServerConfig } from "../../common/config/GameServerConfig";
import { NetworkManager } from "../../network/NetworkManager";
import { GameConfig } from "../../coinpusher/model/GameConfig";
import { UIID } from "../../common/config/GameUIConfig";
import { ShareConfig } from "../../../tsrpc/models/ShareConfig";
import { NetworkConfig } from "../../config/NetworkConfig";
import { GameEvent } from "../../common/config/GameEvent";
import { InitializeEvent } from "../InitializeEvent";
import { ApiClient } from "../../network/ApiClient";

type StatusReporter = (msg: string) => void;

interface ServerSelection {
    rawHost: string;
    protocol: string;
}

/**
 * 自动登录服务：在进入游戏前按顺序进行健康检查、登录、匹配、进房
 * 并在完成后打开主界面。
 */
export class AutoLoginService {
    constructor(private readonly options: { username?: string } = {}) { }

    async run(report?: StatusReporter) {
        const username = this.options.username ?? this.getStoredUsername();

        // 优先根据当前主机适配端点，解决 docker/局域网 localhost 问题
        const resolved = NetworkConfig.resolvedEndpoints;
        NetworkConfig.overrideEndpoints({
            gateUrl: resolved.gateUrl,
            matchUrl: resolved.matchUrl
        });
        NetworkManager.instance.init({
            gateUrl: resolved.gateUrl,
            matchUrl: resolved.matchUrl
        });

        this.report(report, "Checking server status…");
        await this.ensureHealth();

        this.report(report, "Fetching regions…");
        const selection = await this.fetchServerSelection();

        this.report(report, "Connecting to gate server…");
        const gateRes = await NetworkManager.instance.gate.login(username);
        oops.storage.set('USER_ID', gateRes.userId);
        if (gateRes.token) {
            oops.storage.set('SSO_TOKEN', gateRes.token);
        }
        // 同步到 ApiClient，避免后续金币接口使用空用户
        ApiClient.instance.setUserId(gateRes.userId);

        const matchUrl = this.resolveMatchUrl(gateRes.matchUrl, selection);
        if (!matchUrl) {
            throw new Error("Match server address is missing");
        }

        this.report(report, "Connecting to match server…");
        await NetworkManager.instance.match.initClient(matchUrl);
        const matchRes = await NetworkManager.instance.match.startMatch(gateRes.token);

        this.report(report, "Connecting to room server…");
        const connected = await NetworkManager.instance.room.connect(matchRes.serverUrl);
        if (!connected) {
            throw new Error("Failed to connect to room server");
        }

        this.report(report, "Joining room and syncing coins…");
        await NetworkManager.instance.room.joinRoom(matchRes.roomId, gateRes.userId);

        // 确保客户端实体存在，并绑定房间服务以接收快照
        if (!smc.coinPusher) {
            smc.coinPusher = ecs.getEntity<any>(require("../../coinpusher/CoinPusher").CoinPusher);
        }
        if (smc.coinPusher?.Physics) {
            smc.coinPusher.Physics.roomService = NetworkManager.instance.room;
        }

        if (smc.coinPusher?.Physics) {
            smc.coinPusher.Physics.roomService = NetworkManager.instance.room;
        }

        const lastGold = oops.storage.getGlobalData('lastGold');
        const gold = gateRes.gold ?? lastGold ?? smc.coinPusher?.CoinModel.totalGold ?? GameConfig.INIT_GOLD_NUM;
        if (smc.coinPusher?.CoinModel) {
            smc.coinPusher.CoinModel.totalGold = gold;
            oops.storage.setGlobalData('lastGold', gold);
            oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, gold);
        } else {
            // 兜底：先把数值存起来，等界面初始化后读取
            oops.storage.setGlobalData('lastGold', gold);
        }

        if ((gateRes.offlineReward ?? 0) > 0) {
            console.log("[AutoLoginService] Offline reward available:", gateRes.offlineReward);
        }

        oops.storage.set("lastUsername", username);
        oops.storage.set('hasPasskeyLogin', true);
        if (typeof localStorage !== "undefined") {
            localStorage.setItem("USER_ID", gateRes.userId);
            localStorage.setItem("persist_userId", gateRes.userId);
            if (gateRes.token) {
                localStorage.setItem("SSO_TOKEN", gateRes.token);
                localStorage.setItem("persist_token", gateRes.token);
            }
            localStorage.setItem("lastUsername", username);
            localStorage.setItem("persist_username", username);
        }

        this.report(report, "Entering game scene…");
        if (smc.initialize) {
            smc.initialize.login(username, selection?.rawHost ?? "");
        } else {
            console.warn("[AutoLoginService] smc.initialize not ready, dispatching login success directly");
            // 确保登录界面被关闭
            if (oops.gui.get(UIID.Login)) {
                oops.gui.remove(UIID.Login);
            }
            oops.message.dispatchEvent(GameEvent.LoginSuccess);
            oops.message.dispatchEvent(InitializeEvent.Logined);
        }
        // 游戏主界面改为在摄像机动画结束后打开（参见 CoinPusher.startGame）
    }

    private report(report: StatusReporter | undefined, message: string) {
        if (report) {
            report(message);
        }
    }

    private getStoredUsername(): string {
        // 优先 localStorage（刷新/回跳后依然可读）
        if (typeof localStorage !== "undefined") {
            const local = localStorage.getItem("lastUsername") || localStorage.getItem("persist_username");
            if (local && typeof local === "string") {
                return local;
            }
        }
        const stored = oops.storage.get("lastUsername");
        if (stored && typeof stored === "string") return stored;
        const fallbacks = ["oops", "framework", "guide", "slg", "rpg", "coin"];
        return fallbacks[Math.random() * fallbacks.length | 0];
    }

    private async ensureHealth() {
        const res = await smc.net.hcGate.callApi("Health", {});
        if (!res.isSucc) {
            throw new Error(res.err?.message ?? "Health check failed");
        }
    }

    private async fetchServerSelection(): Promise<ServerSelection> {
        const ret = await smc.net.hcGate.callApi("GameArea", {});
        if (!ret.isSucc || !ret.res.area?.length) {
            throw new Error(ret.err?.message ?? "Failed to fetch region list");
        }

        const initializeComp = smc.initialize;
        if (initializeComp) {
            initializeComp.GateModel = initializeComp.GateModel ?? { area: [] } as any;
            initializeComp.GateModel.area = ret.res.area;
        }

        const target = ret.res.area[0];
        if (!target?.server) {
            throw new Error("Region list is empty");
        }

        const protocol = ShareConfig.https ? "https" : "http";
        GameServerConfig.match = `${protocol}://${target.server}/`;

        return {
            rawHost: target.server,
            protocol
        };
    }

    private resolveMatchUrl(provided?: string, selection?: ServerSelection): string | undefined {
        if (!provided) {
            return NetworkConfig.resolvedEndpoints.matchUrl ?? NetworkConfig.endpoints.matchUrl;
        }

        try {
            const parsed = new URL(provided);
            if (this.isLoopbackHost(parsed.hostname)) {
                return NetworkConfig.resolvedEndpoints.matchUrl ?? NetworkConfig.endpoints.matchUrl ?? provided;
            }
            return provided;
        } catch (error) {
            console.warn("[AutoLoginService] Invalid matchUrl received:", provided, error);
            if (selection?.rawHost) {
                return `${selection.protocol}://${selection.rawHost}`;
            }
            return NetworkConfig.resolvedEndpoints.matchUrl ?? NetworkConfig.endpoints.matchUrl ?? provided;
        }
    }

    private isLoopbackHost(host: string): boolean {
        return host === "localhost" || host === "::1" || host.startsWith("127.") || host === "0.0.0.0";
    }
}
