import { serviceProto as ServiceProtoRoom, ServiceType as ServiceTypeRoom } from "../../tsrpc/protocols/ServiceProtoRoom";
import { CC_EDITOR } from "cc/env";
import type { WsClient } from "tsrpc-browser";
import { MsgSyncPhysics } from "../../tsrpc/protocols/room/game/MsgSyncPhysics";
import { ReqDropCoin, ResDropCoin } from "../../tsrpc/protocols/room/game/PtlDropCoin";
import { ShareConfig } from "../../tsrpc/models/ShareConfig";
import { Security } from "../../tsrpc/models/Security";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { BaseResponse } from "../../tsrpc/protocols/base";
import { SecurityUtil } from "../security/SecurityUtil";

export class RoomService {
    client: WsClient<ServiceTypeRoom> | null = null;
    private _physicsListenerAttached = false;
    /** 仅首个快照打印一次统计，排查位置/坐标系问题 */
    private _loggedSnapshotStats = false;

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

    /** 连接房间服务器 */
    async connect(serverUrl: string): Promise<boolean> {
        if (CC_EDITOR) return false;

        try {
            const { WsClient } = await import("tsrpc-browser");

            if (this.client) {
                await this.client.disconnect();
                this.client = null;
                this._physicsListenerAttached = false;
            }

            // 自定义 logger：忽略 DropCoin 的 Parse server output error 噪音，其余正常输出
            const quietLogger = {
                log: (...args: any[]) => { /* noop */ },
                debug: (...args: any[]) => { /* noop */ },
                info: (...args: any[]) => { /* noop */ },
                warn: (...args: any[]) => console.warn(...args),
                error: (...args: any[]) => {
                    const isParseErr = args.some(a => {
                        if (typeof a === 'string') return a.includes('Parse server output error');
                        if (a && typeof a === 'object' && 'message' in a) {
                            const m = (a as any).message;
                            return typeof m === 'string' && m.includes('Parse server output error');
                        }
                        return false;
                    });
                    if (isParseErr) {
                        return;
                    }
                    console.error(...args);
                }
            };

            this.client = new WsClient(ServiceProtoRoom, {
                server: serverUrl,
                logger: quietLogger as any,
                logMsg: false,   // 关闭 [SendMsg]/[RecvMsg] 日志刷屏
                json: ShareConfig.json,
                heartbeat: {
                    interval: ShareConfig.heartbeat_interval,
                    timeout: ShareConfig.heartbeat_timeout
                }
            });
            this._applySecurity(this.client);
            this._applyAuth(this.client);

            await this.client.connect();
            this.listenPhysics();
            console.log(`[RoomService] ✅ Connected to room server: ${serverUrl}`);
            return true;
        } catch (error) {
            console.error('[RoomService] Failed to connect:', error);
            this.client = null;
            this._physicsListenerAttached = false;
            return false;
        }
    }

    /** 加入房间 */
    async joinRoom(roomId: string, userId?: string | number) {
        if (!this.client) {
            throw new Error("Room client not connected");
        }

        const parsedUserId = typeof userId === 'string'
            ? parseInt(userId, 10)
            : userId;

        const res = await this.client.callApi("RoomJoin", {
            roomId,
            userId: Number.isFinite(parsedUserId as number) ? (parsedUserId as number) : 0
        });

        if (!res.isSucc) {
            throw new Error(res.err.message);
        }

        // 只有加入房间成功后才开始 Ping
        this.startPing();
        return res.res;
    }

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
        if (!this.client || this._physicsListenerAttached) return;

        this.client.listenMsg("game/SyncPhysics", (msg) => {
            this.snapshots.push({
                serverTick: msg.serverTick,  // ✅ 使用服务器时间
                clientTime: Date.now(),      // 客户端接收时间（仅用于调试）
                data: msg
            });
            // 保持缓冲区长度
            if (this.snapshots.length > 60) this.snapshots.shift();

            // 仅前 20 条快照打印摘要，排查金币消失/removed 情况（避免刷屏）
            if (this.snapshots.length <= 20) {
                const removedCount = msg.removed?.length ?? 0;
                const coinCount = msg.coins?.length ?? 0;
                console.log(`[RoomService] Snapshot tick=${msg.serverTick} coins=${coinCount} removed=${removedCount}`);
            }

            // 首次快照打印位置范围，便于定位“金币看不见/掉下去”
            if (!this._loggedSnapshotStats) {
                const coins = msg.coins ?? [];
                if (coins.length > 0) {
                    const stats = coins.reduce(
                        (acc, c) => {
                            acc.minX = Math.min(acc.minX, c.p.x);
                            acc.maxX = Math.max(acc.maxX, c.p.x);
                            acc.minY = Math.min(acc.minY, c.p.y);
                            acc.maxY = Math.max(acc.maxY, c.p.y);
                            acc.minZ = Math.min(acc.minZ, c.p.z);
                            acc.maxZ = Math.max(acc.maxZ, c.p.z);
                            return acc;
                        },
                        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity }
                    );
                    console.log(
                        `[RoomService] First snapshot stats tick=${msg.serverTick} coins=${coins.length} ` +
                        `x[${stats.minX.toFixed(2)}, ${stats.maxX.toFixed(2)}] ` +
                        `y[${stats.minY.toFixed(2)}, ${stats.maxY.toFixed(2)}] ` +
                        `z[${stats.minZ.toFixed(2)}, ${stats.maxZ.toFixed(2)}]`
                    );
                } else {
                    console.warn(`[RoomService] First snapshot contains 0 coins, tick=${msg.serverTick}`);
                }
                this._loggedSnapshotStats = true;
            }

            // 更新估计的 serverTick
            this.estimatedServerTick = msg.serverTick;
        });
        this._physicsListenerAttached = true;
    }

    /** 投币 */
    async dropCoin(x: number): Promise<{ isSucc: boolean, coinId?: number, err?: any }> {
        if (!this.client) return { isSucc: false, err: new Error("Client not initialized") };

        const [fingerprintId, nonce, timestamp] = await Promise.all([
            SecurityUtil.getFingerprintId(),
            Promise.resolve(SecurityUtil.generateNonce()),
            Promise.resolve(SecurityUtil.now())
        ]);

        const res = await this.client.callApi("game/DropCoin", { x, fingerprintId, nonce, timestamp });
        if (res.isSucc) {
            return { isSucc: true, coinId: res.res.coinId };
        }

        return { isSucc: false, err: res.err };
    }

    /** 销毁时清理 */
    destroy() {
        this.stopPing();
        this.client = null;
    }

    private _applySecurity(client: WsClient<ServiceTypeRoom>) {
        if (!ShareConfig.security) return;

        client.flows.preSendMsgFlow.push(v => {
            if (v.data instanceof Uint8Array) {
                v.data = Security.encrypt(v.data);
            }
            return v;
        });

        client.flows.preRecvMsgFlow.push(v => {
            if (v.data instanceof Uint8Array) {
                v.data = Security.decrypt(v.data);
            }
            return v;
        });
    }

    private _applyAuth(client: WsClient<ServiceTypeRoom>) {
        client.flows.preCallApiFlow.push(v => {
            const token = oops.storage.get("SSO_TOKEN");
            if (token) {
                (v.req as any).__ssoToken = token;
            }
            return v;
        });

        client.flows.postApiReturnFlow.push(v => {
            if (v.return.isSucc) {
                const res = v.return.res as BaseResponse;
                if (res.__ssoToken !== undefined) {
                    oops.storage.set('SSO_TOKEN', res.__ssoToken);
                }
            } else if (v.return.err.code === 'NEED_LOGIN') {
                oops.storage.remove('SSO_TOKEN');
            }
            return v;
        });
    }
}
