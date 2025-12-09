/** Room Server 信息 */
export interface RoomServerInfo {
    serverId: string;
    url: string;
    roomCount: number;
    userCount: number;
    cpuUsage: number;
    lastHeartbeat: number;
}

export class RoomServerManager {
    private static _instance: RoomServerManager;
    static get instance(): RoomServerManager {
        if (!this._instance) this._instance = new RoomServerManager();
        return this._instance;
    }

    // serverId -> Info
    private servers: Map<string, RoomServerInfo> = new Map();

    register(info: RoomServerInfo) {
        this.servers.set(info.serverId, info);
        console.log(`[Match] RoomServer registered: ${info.serverId}`);
    }

    updateStatus(serverId: string, status: Partial<RoomServerInfo>) {
        const server = this.servers.get(serverId);
        if (server) {
            Object.assign(server, status);
            server.lastHeartbeat = Date.now();
        }
    }

    /** 获取最佳 Room Server (负载最低) */
    getBestServer(): string | null {
        let best: RoomServerInfo | null = null;
        let minScore = Infinity;

        const now = Date.now();

        for (const server of this.servers.values()) {
            // 剔除超时节点 (15秒无心跳)
            if (now - server.lastHeartbeat > 15000) {
                continue;
            }

            // 简单的负载评分：优先房间少、CPU 低的
            // score = roomCount + cpuUsage
            const score = server.roomCount + server.cpuUsage;
            
            if (score < minScore) {
                minScore = score;
                best = server;
            }
        }
        
        if (!best) return null;
        return best.url;
    }

    /** 清理超时节点 */
    cleanUp() {
        const now = Date.now();
        for (const [id, server] of this.servers) {
            if (now - server.lastHeartbeat > 30000) {
                this.servers.delete(id);
                console.log(`[Match] RoomServer removed (timeout): ${id}`);
            }
        }
    }
}
