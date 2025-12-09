import { GateService } from "./GateService";
import { MatchService } from "./MatchService";
import { RoomService } from "./RoomService";

export class NetworkManager {
    private static _instance: NetworkManager;
    static get instance(): NetworkManager {
        if (!this._instance) this._instance = new NetworkManager();
        return this._instance;
    }

    gate: GateService = null!;
    match: MatchService = null!;
    room: RoomService = null!;

    // 配置
    private config = {
        gateUrl: "http://localhost:2000", // 开发环境默认值
    };

    init(gateUrl: string) {
        this.config.gateUrl = gateUrl;
        this.gate = new GateService(gateUrl);
        this.match = new MatchService();
        this.room = new RoomService();
        console.log(`[NetworkManager] Initialized with Gate: ${gateUrl}`);
    }
}
