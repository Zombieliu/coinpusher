import { serviceProto as ServiceProtoRoom, ServiceType as ServiceTypeRoom } from "../../tsrpc/protocols/ServiceProtoRoom";
import { CC_EDITOR } from "cc/env";
import type { WsClient } from "tsrpc-browser";
import { MsgSyncPhysics } from "../../tsrpc/protocols/room/game/MsgSyncPhysics";
import { ReqDropCoin, ResDropCoin } from "../../tsrpc/protocols/room/game/PtlDropCoin";

export class RoomService {
    client: WsClient<ServiceTypeRoom> | null = null;

    // ========== 快照缓冲区 ==========
    snapshots: { serverTick: number, clientTime: number, data: MsgSyncPhysics }[] = [];

    // ========== RTT 测量 & 时间同步 ==========
    /** 往返延迟 (ms) - 使用移动平均 */
    rtt: number = 0;

    /** 服务器时间偏移 (ms) - clientTime + offset = serverTime */
    serverTimeOffset: number = 0;

    /** 服务器当前估计 tick - 用于插值 */
    estimatedServerTick: number = 0;

    /** Ping 间隔计时器 */
    private _pingTimer: any = null;

    /** RTT 样本历史 (最多保留10个) */
    private _rttSamples: number[] = [];

    // ========== 方法 ==========

    /** 开始定期Ping - 建议连接后立即调用 */
    startPing(interval: number = 2000) {
        if (this._pingTimer) return; // 已经在运行

        // 立即执行一次
        this._sendPing();

        // 定期执行
        this._pingTimer = setInterval(() => {
            this._sendPing();
        }, interval);
    }

    /** 停止Ping */
    stopPing() {
        if (this._pingTimer) {
            clearInterval(this._pingTimer);
            this._pingTimer = null;
        }
    }

    /** 发送Ping请求并计算RTT */
    private async _sendPing() {
        if (!this.client) return;

        const t0 = Date.now(); // 发送时间

        try {
            const res = await this.client.callApi("game/Ping", {
                clientTime: t0
            });

            if (!res.isSucc) return;

            const t1 = Date.now(); // 接收时间

            // 计算 RTT (往返延迟)
            const rtt = t1 - t0;

            // 更新 RTT 移动平均
            this._rttSamples.push(rtt);
            if (this._rttSamples.length > 10) this._rttSamples.shift();
            this.rtt = this._rttSamples.reduce((a, b) => a + b, 0) / this._rttSamples.length;

            // 计算服务器时间偏移
            // 假设网络延迟对称：单程延迟 = RTT / 2
            const oneWayDelay = this.rtt / 2;
            const estimatedServerTime = res.res.serverTime + oneWayDelay;
            this.serverTimeOffset = estimatedServerTime - t1;

            // 更新服务器 tick
            this.estimatedServerTick = res.res.serverTick;

            console.log(`[RTT] ${this.rtt.toFixed(1)}ms | Offset: ${this.serverTimeOffset.toFixed(1)}ms | ServerTick: ${this.estimatedServerTick}`);
        } catch (err) {
            console.error('[Ping] Failed:', err);
        }
    }

    /** 获取当前服务器时间估计值 */
    getServerTime(): number {
        return Date.now() + this.serverTimeOffset;
    }

    /** 监听物理快照 */
    listenPhysics() {
        if (!this.client) return;

        this.client.listenMsg("game/SyncPhysics", (msg) => {
            this.snapshots.push({
                serverTick: msg.serverTick,  // ✅ 使用服务器时间
                clientTime: Date.now(),      // 客户端接收时间（仅用于调试）
                data: msg
            });
            // 保持缓冲区长度
            if (this.snapshots.length > 60) this.snapshots.shift();

            // 更新估计的 serverTick
            this.estimatedServerTick = msg.serverTick;
        });
    }

    /** 投币 */
    async dropCoin(x: number): Promise<{ isSucc: boolean, coinId?: number, err?: any }> {
        if (!this.client) return { isSucc: false, err: new Error("Client not initialized") };

        const res = await this.client.callApi("game/DropCoin", { x });
        if (res.isSucc) {
            return { isSucc: true, coinId: res.res.coinId };
        } else {
            return { isSucc: false, err: res.err };
        }
    }

    /** 销毁时清理 */
    destroy() {
        this.stopPing();
        this.client = null;
    }
}
