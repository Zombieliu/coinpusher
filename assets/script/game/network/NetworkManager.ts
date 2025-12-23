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
    private endpoints: NetworkEndpoints = NetworkConfig.endpoints;

    init(overrides?: Partial<NetworkEndpoints>) {
        if (overrides) {
            NetworkConfig.overrideEndpoints(overrides);
        }

        this.endpoints = NetworkConfig.endpoints;
        this.gate = new GateService(this.endpoints.gateUrl);
        this.match = new MatchService();
        this.room = new RoomService();
        console.log(`[NetworkManager] Initialized with Gate: ${this.endpoints.gateUrl}`);
    }
}
