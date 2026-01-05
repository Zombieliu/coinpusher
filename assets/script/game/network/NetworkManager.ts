import { GateService } from "./GateService";
import { MatchService } from "./MatchService";
import { RoomService } from "./RoomService";
import { NetworkConfig, NetworkEndpoints } from "../config/NetworkConfig";

export class NetworkManager {
    private static _instance: NetworkManager;
    static get instance(): NetworkManager {
        if (!this._instance) this._instance = new NetworkManager();
        return this._instance;
    }

    gate: GateService = null!;
    match: MatchService = null!;
    room: RoomService = null!;

    // 当前端点配置
    private endpoints: NetworkEndpoints = NetworkConfig.resolvedEndpoints;

    init(overrides?: Partial<NetworkEndpoints>) {
        if (overrides) {
            NetworkConfig.overrideEndpoints(overrides);
        }

        // 每次 init 都重新读取（覆盖 earlier init），便于运行时更新 docker/局域网地址
        this.endpoints = NetworkConfig.resolvedEndpoints;
        this.gate = new GateService(this.endpoints.gateUrl);
        this.match = new MatchService();
        this.room = new RoomService();
        console.log(`[NetworkManager] Initialized with Gate: ${this.endpoints.gateUrl}, Match (fallback): ${this.endpoints.matchUrl}`);
    }
}
