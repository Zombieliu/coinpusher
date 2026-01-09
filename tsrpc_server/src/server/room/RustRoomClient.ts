/**
 * Rust Room Service TCP 客户端（优化版）
 *
 * 职责：
 * 1. 连接 Rust Room Service (TCP)
 * 2. 发送 FromNode 消息（创建房间、投币等）
 * 3. 接收 ToNode 消息（快照、事件等）
 * 4. 支持 MessagePack 编解码（减少 60% 带宽）
 * 5. 支持增量快照 DeltaSnapshot（减少 80% 带宽）
 *
 * 协议格式：1字节格式标志 + 4字节长度 + 消息体
 * - 格式标志：0=JSON, 1=MessagePack
 */

import * as net from 'net';
import { EventEmitter } from 'events';
import * as msgpack from 'msgpack-lite';
import { HttpClient } from 'tsrpc';
import { serviceProto as ServiceProtoGate, ServiceType as ServiceTypeGate } from '../../tsrpc/protocols/ServiceProtoGate';
import { signInternalRequest } from '../utils/SecurityUtils';
import { SnapshotValidator, SignedSnapshot } from '../utils/SnapshotValidator';
import { PhysicsComp } from './bll/physics/PhysicsComp';

const rustIntegrationEnabled = (() => {
    const raw = process.env.RUST_ROOM_ENABLED;
    if (raw === undefined) {
        return true;
    }
    return raw.toLowerCase() === 'true';
})();

// ========== 协议定义（和 Rust 对应） ==========

export type RoomId = string;
export type PlayerId = string;
export type CoinId = number;
export type TransactionId = string;

export interface RoomConfig {
    gravity: number;
    drop_height: number;
    coin_radius: number;
    coin_height: number;
    reward_line_z: number;
    push_min_z: number;
    push_max_z: number;
    push_speed: number;
    snapshot_rate?: number;  // 快照推送频率(Hz)，默认30
}

// Node → Rust
export type FromNode =
    | { type: 'CreateRoom'; room_id: RoomId; config: RoomConfig }
    | { type: 'DestroyRoom'; room_id: RoomId }
    | { type: 'PlayerJoin'; room_id: RoomId; player_id: PlayerId }
    | { type: 'PlayerLeave'; room_id: RoomId; player_id: PlayerId }
    | { type: 'PlayerDropCoin'; room_id: RoomId; player_id: PlayerId; x: number; client_tick?: number }
    | { type: 'WalletResult'; room_id: RoomId; player_id: PlayerId; tx_id: TransactionId; ok: boolean };

// Rust → Node
export type ToNode =
    | { type: 'Snapshot'; room_id: RoomId; tick: number; push_z: number; push_velocity: number; coins: CoinState[]; events: RoomEvent[]; timestamp?: number; signature?: string }
    | { type: 'DeltaSnapshot'; room_id: RoomId; tick: number; push_z: number; push_velocity: number; added: CoinState[]; updated: CoinState[]; removed: CoinId[]; events: RoomEvent[]; timestamp?: number; signature?: string }
    | { type: 'NeedDeductGold'; room_id: RoomId; player_id: PlayerId; tx_id: TransactionId; amount: number }
    | { type: 'RoomClosed'; room_id: RoomId; reason: string };

export interface CoinState {
    id: CoinId;
    p: { x: number; y: number; z: number };
    r: { x: number; y: number; z: number; w: number };
}

export type RoomEvent =
    | { kind: 'CoinDroppedToReward'; player_id: PlayerId; coin_id: CoinId; reward_amount: number }
    | { kind: 'CoinCollected'; coin_ids: CoinId[] };

// ========== TCP 客户端 ==========

export class RustRoomClient extends EventEmitter {
    private client: net.Socket | null = null;
    private connected: boolean = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private autoReconnect: boolean = true;

    // 接收缓冲区
    private receiveBuffer: Buffer = Buffer.alloc(0);

    // 硬币状态缓存（用于应用增量更新）
    // roomId -> coinId -> CoinState
    private coinStates: Map<RoomId, Map<CoinId, CoinState>> = new Map();

    // 是否使用 MessagePack（默认true）
    private useMessagePack: boolean = true;
    private pendingMessages: FromNode[] = [];

    constructor(
        private host: string = '127.0.0.1',
        private port: number = 9000
    ) {
        super();
    }

    /**
     * 连接到 Rust Room Service
     */
    connect(): void {
        if (this.client) {
            console.warn('[RustRoomClient] Already connected or connecting');
            return;
        }

        console.log(`[RustRoomClient] Connecting to ${this.host}:${this.port}...`);

        this.client = net.connect({ host: this.host, port: this.port });

        this.client.on('connect', () => {
            console.log('[RustRoomClient] ✅ Connected to Rust Room Service');
            this.connected = true;
            this.emit('connected');
            this.flushPendingMessages();

            // 清除重连定时器
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        });

        this.client.on('data', (data: Buffer) => {
            this.handleIncomingData(data);
        });

        this.client.on('error', (err: Error) => {
            console.error('[RustRoomClient] Error:', err.message);
            this.emit('error', err);
        });

        this.client.on('close', () => {
            console.warn('[RustRoomClient] Connection closed');
            this.connected = false;
            this.client = null;
            this.emit('disconnected');

            // 自动重连（5秒后）
            if (this.autoReconnect && !this.reconnectTimer) {
                this.reconnectTimer = setTimeout(() => {
                    console.log('[RustRoomClient] Attempting reconnect...');
                    this.connect();
                }, 5000);
            }
        });
    }

    /**
     * 断开连接
     */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.client) {
            this.client.destroy();
            this.client = null;
        }

        this.connected = false;
    }

    /** 停止自动重连（测试或关闭时调用） */
    disableReconnect(): void {
        this.autoReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * 发送消息到 Rust（支持 MessagePack）
     */
    send(msg: FromNode): boolean {
        if (!this.connected || !this.client) {
            console.warn(`[RustRoomClient] Not connected, queue message: ${msg.type}`);
            this.pendingMessages.push(msg);
            return false;
        }

        try {
            let data: Buffer;
            let formatByte: number;

            if (this.useMessagePack) {
                // 使用 MessagePack 编码（减少60%数据量）
                data = msgpack.encode(msg) as Buffer;
                formatByte = 1;
            } else {
                // 使用 JSON 编码（向后兼容）
                const json = JSON.stringify(msg);
                data = Buffer.from(json, 'utf-8');
                formatByte = 0;
            }

            // 构建完整消息：1字节格式标志 + 4字节长度 + 数据
            const header = Buffer.alloc(5);
            header.writeUInt8(formatByte, 0);
            header.writeUInt32BE(data.length, 1);

            this.client.write(Buffer.concat([header, data]));

            console.log(`[RustRoomClient] → Sent: ${msg.type} (${data.length} bytes, ${formatByte === 1 ? 'MsgPack' : 'JSON'})`);
            return true;
        } catch (err) {
            console.error('[RustRoomClient] Send error:', err);
            return false;
        }
    }

    private flushPendingMessages(): void {
        if (!this.connected || !this.client || this.pendingMessages.length === 0) {
            return;
        }

        const queue = [...this.pendingMessages];
        this.pendingMessages.length = 0;

        for (const msg of queue) {
            this.send(msg);
        }
    }

    /**
     * 处理接收到的数据（支持新协议格式）
     */
    private handleIncomingData(data: Buffer): void {
        // 追加到接收缓冲区
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);

        // 尝试解析消息（新格式：1字节格式标志 + 4字节长度 + 数据）
        while (this.receiveBuffer.length >= 5) {
            // 读取格式标志
            const formatByte = this.receiveBuffer.readUInt8(0);

            // 读取长度前缀
            const messageLength = this.receiveBuffer.readUInt32BE(1);

            // 检查是否接收完整
            if (this.receiveBuffer.length < 5 + messageLength) {
                break; // 等待更多数据
            }

            // 提取消息体
            const messageBuffer = this.receiveBuffer.slice(5, 5 + messageLength);
            this.receiveBuffer = this.receiveBuffer.slice(5 + messageLength);

            // 根据格式解码
            try {
                let msg: any;

                if (formatByte === 0) {
                    // JSON 格式
                    const json = messageBuffer.toString('utf-8');
                    msg = JSON.parse(json);
                } else if (formatByte === 1) {
                    // MessagePack 格式
                    msg = msgpack.decode(messageBuffer);
                    // 转换数组格式到对象格式
                    msg = this.parseMessagePackMessage(msg);
                } else {
                    console.error(`[RustRoomClient] Unknown format byte: ${formatByte}`);
                    continue;
                }

                this.handleMessage(msg);
            } catch (err) {
                console.error('[RustRoomClient] Message parse error:', err);
            }
        }
    }

    /**
     * 解析 MessagePack 数组格式到对象格式
     * Rust 的枚举序列化为数组：['TypeName', field1, field2, ...]
     */
    private parseMessagePackMessage(msgArray: any): ToNode {
        if (!Array.isArray(msgArray) || msgArray.length === 0) {
            return msgArray;
        }

        const msgType = msgArray[0];

        switch (msgType) {
            case 'Snapshot':
                return {
                    type: 'Snapshot',
                    room_id: msgArray[1],
                    tick: msgArray[2],
                    push_z: msgArray[3],
                    push_velocity: msgArray[4],
                    coins: msgArray[5] || [],
                    events: msgArray[6] || []
                };

            case 'DeltaSnapshot':
                return {
                    type: 'DeltaSnapshot',
                    room_id: msgArray[1],
                    tick: msgArray[2],
                    push_z: msgArray[3],
                    push_velocity: msgArray[4],
                    added: msgArray[5] || [],
                    updated: msgArray[6] || [],
                    removed: msgArray[7] || [],
                    events: msgArray[8] || []
                };

            case 'NeedDeductGold':
                return {
                    type: 'NeedDeductGold',
                    room_id: msgArray[1],
                    player_id: msgArray[2],
                    tx_id: msgArray[3],
                    amount: msgArray[4]
                };

            case 'RoomClosed':
                return {
                    type: 'RoomClosed',
                    room_id: msgArray[1],
                    reason: msgArray[2]
                };

            default:
                console.warn(`[RustRoomClient] Unknown message type: ${msgType}`);
                return msgArray as any;
        }
    }

    /**
     * 处理接收到的消息
     */
    private handleMessage(msg: ToNode): void {
        console.log(`[RustRoomClient] ← Received: ${msg.type}`);

        // 触发事件
        this.emit('message', msg);

        // 分类处理
        switch (msg.type) {
            case 'Snapshot':
                this.emit('snapshot', msg);
                break;
            case 'DeltaSnapshot':
                this.emit('deltaSnapshot', msg);
                break;
            case 'NeedDeductGold':
                this.emit('needDeductGold', msg);
                break;
            case 'RoomClosed':
                this.emit('roomClosed', msg);
                break;
        }
    }

    /**
     * 应用增量快照到房间状态
     */
    private applyDeltaSnapshot(roomId: RoomId, delta: Extract<ToNode, { type: 'DeltaSnapshot' }>): CoinState[] {
        let coins = this.coinStates.get(roomId);
        if (!coins) {
            coins = new Map();
            this.coinStates.set(roomId, coins);
        }

        console.log(
            `[RustRoomClient] DeltaSnapshot stats room=${roomId} tick=${delta.tick} added=${delta.added.length} updated=${delta.updated.length} removed=${delta.removed.length}`
        );

        // 添加新硬币
        for (const raw of delta.added) {
            const coin = normalizeCoinState(raw);
            if (coin) {
                coins.set(coin.id, coin);
            } else {
                console.warn('[RustRoomClient] Failed to normalize added coin state:', raw);
            }
        }

        // 更新已有硬币
        for (const raw of delta.updated) {
            const coin = normalizeCoinState(raw);
            if (coin) {
                coins.set(coin.id, coin);
            } else {
                console.warn('[RustRoomClient] Failed to normalize updated coin state:', raw);
            }
        }

        // 移除硬币
        for (const coinId of delta.removed) {
            coins.delete(coinId);
        }

        console.log(`[RustRoomClient] Room ${roomId} coin cache size=${coins.size}`);

        return Array.from(coins.values());
    }

    // ========== 便捷方法 ==========

    createRoom(roomId: RoomId, config: RoomConfig): boolean {
        return this.send({ type: 'CreateRoom', room_id: roomId, config });
    }

    destroyRoom(roomId: RoomId): boolean {
        return this.send({ type: 'DestroyRoom', room_id: roomId });
    }

    playerJoin(roomId: RoomId, playerId: PlayerId): boolean {
        return this.send({ type: 'PlayerJoin', room_id: roomId, player_id: playerId });
    }

    playerLeave(roomId: RoomId, playerId: PlayerId): boolean {
        return this.send({ type: 'PlayerLeave', room_id: roomId, player_id: playerId });
    }

    playerDropCoin(roomId: RoomId, playerId: PlayerId, x: number, clientTick?: number): boolean {
        return this.send({
            type: 'PlayerDropCoin',
            room_id: roomId,
            player_id: playerId,
            x,
            client_tick: clientTick
        });
    }

    walletResult(roomId: RoomId, playerId: PlayerId, txId: TransactionId, ok: boolean): boolean {
        return this.send({
            type: 'WalletResult',
            room_id: roomId,
            player_id: playerId,
            tx_id: txId,
            ok
        });
    }

    isConnected(): boolean {
        return this.connected;
    }
}

function isMapLike(value: any): value is Map<string, any> {
    return value && typeof value === 'object' && typeof value.get === 'function' && value.constructor?.name === 'Map';
}

function getField(source: any, key: string) {
    if (!source) {
        return undefined;
    }
    if (isMapLike(source)) {
        return source.get(key);
    }
    return source[key];
}

function toPlainObject(source: any) {
    if (!source) {
        return source;
    }
    if (isMapLike(source)) {
        const obj: Record<string, any> = {};
        source.forEach((value: any, key: string) => {
            obj[key] = value;
        });
        return obj;
    }
    return source;
}

function normalizeVector(raw: any) {
    if (raw == null) {
        return { x: 0, y: 0, z: 0 };
    }

    if (Array.isArray(raw)) {
        const [x = 0, y = 0, z = 0] = raw;
        return { x: Number(x), y: Number(y), z: Number(z) };
    }

    return {
        x: Number(getField(raw, 'x') ?? 0),
        y: Number(getField(raw, 'y') ?? 0),
        z: Number(getField(raw, 'z') ?? 0)
    };
}

function normalizeRotation(raw: any) {
    if (raw == null) {
        return { x: 0, y: 0, z: 0, w: 1 };
    }

    if (Array.isArray(raw)) {
        const [x = 0, y = 0, z = 0, w = 1] = raw;
        return { x: Number(x), y: Number(y), z: Number(z), w: Number(w) };
    }

    return {
        x: Number(getField(raw, 'x') ?? 0),
        y: Number(getField(raw, 'y') ?? 0),
        z: Number(getField(raw, 'z') ?? 0),
        w: Number(getField(raw, 'w') ?? 1)
    };
}

function normalizeCoinState(raw: any): CoinState | null {
    if (!raw) {
        return null;
    }

    let id: any;
    let positionRaw: any;
    let rotationRaw: any;

    if (Array.isArray(raw)) {
        [id, positionRaw, rotationRaw] = raw;
    } else {
        id = getField(raw, 'id') ?? getField(raw, 'coin_id');
        positionRaw = getField(raw, 'p') ?? getField(raw, 'position');
        rotationRaw = getField(raw, 'r') ?? getField(raw, 'rotation');
    }

    if (id === undefined || id === null) {
        console.warn('[RustRoomClient] normalizeCoinState missing id. raw=', toPlainObject(raw));
        return null;
    }

    if (!positionRaw || !rotationRaw) {
        console.warn(
            '[RustRoomClient] normalizeCoinState missing position or rotation',
            { raw: toPlainObject(raw), positionRaw: toPlainObject(positionRaw), rotationRaw: toPlainObject(rotationRaw) }
        );
    }

    return {
        id: Number(id),
        p: normalizeVector(positionRaw),
        r: normalizeRotation(rotationRaw)
    };
}

// ========== 单例导出 ==========

let rustRoomClient: (RustRoomClient | DummyRustRoomClient) | null = null;

class DummyRustRoomClient extends EventEmitter {
    connect() {
        console.warn('[RustRoomClient] Integration disabled. Running in dummy mode.');
    }
    createRoom(_roomId: RoomId, _config: RoomConfig) {
        console.log(`[RustRoomClient] (dummy) createRoom ${_roomId}`);
    }
    destroyRoom(_roomId: RoomId) { }
    playerJoin(_roomId: RoomId, _playerId: PlayerId) { }
    playerLeave(_roomId: RoomId, _playerId: PlayerId) { }
    playerDropCoin(_roomId: RoomId, _playerId: PlayerId, _x: number, _tick?: number) { }
    handleWalletResult(_roomId: RoomId, _playerId: PlayerId, _txId: TransactionId, _ok: boolean) { }
    walletResult(_roomId: RoomId, _playerId: PlayerId, _txId: TransactionId, _ok: boolean): boolean {
        console.log('[RustRoomClient] (dummy) walletResult invoked');
        return true;
    }
    ['applyDeltaSnapshot'](_roomId: RoomId, _delta: any) {
        return [];
    }
}

export function getRustRoomClient(): RustRoomClient | DummyRustRoomClient {
    if (!rustRoomClient) {
        if (!rustIntegrationEnabled) {
            rustRoomClient = new DummyRustRoomClient();
            rustRoomClient.connect();
        } else {
            const host = process.env.RUST_ROOM_HOST || '127.0.0.1';
            // 宿主默认连接容器映射端口 39000；容器内部可显式设置 9000
            const port = parseInt(process.env.RUST_ROOM_PORT || '39000');

            console.log(`[RustRoomClient] Integration enabled. Connecting target: ${host}:${port}`);

            const client = new RustRoomClient(host, port);
            rustRoomClient = client;
            client.connect();

            client.on('snapshot', (msg: Extract<ToNode, { type: 'Snapshot' }>) => {
                handleRustSnapshot(msg);
            });

            client.on('deltaSnapshot', (msg: Extract<ToNode, { type: 'DeltaSnapshot' }>) => {
                handleRustDeltaSnapshot(msg);
            });

            client.on('needDeductGold', (msg: Extract<ToNode, { type: 'NeedDeductGold' }>) => {
                handleNeedDeductGold(msg);
            });

            client.on('roomClosed', (msg: Extract<ToNode, { type: 'RoomClosed' }>) => {
                console.warn(`[RustRoomClient] Room closed: ${msg.room_id}, reason: ${msg.reason}`);
            });
        }
    }

    return rustRoomClient!;
}

/**
 * 处理 Rust 完整快照 - 广播给客户端
 */
async function handleRustSnapshot(msg: Extract<ToNode, { type: 'Snapshot' }>) {
    const normalizedCoins = msg.coins
        .map(normalizeCoinState)
        .filter((coin): coin is CoinState => !!coin);

    // 🔒 验证快照签名（如果启用）
    if (SnapshotValidator.isSignatureEnabled()) {
        const snapshot: SignedSnapshot = {
            tick: msg.tick,
            roomId: msg.room_id,
            pushZ: msg.push_z,
            coins: normalizedCoins,
            events: msg.events,
            timestamp: msg.timestamp || Date.now(),
            signature: msg.signature
        };

        const verification = SnapshotValidator.verifySnapshot(snapshot);
        if (!verification.valid) {
            console.error(`[RustRoomClient] ⚠️ Snapshot signature verification failed: ${verification.error}`);
            console.error(`[RustRoomClient] Rejecting snapshot for room ${msg.room_id}, tick ${msg.tick}`);
            return; // 拒绝处理未签名/签名无效的快照
        }
    }

    // 动态导入以避免循环依赖
    const { sr } = require('../../ServerRoom');

    const room = sr.ServerRoomModel.rooms.get(msg.room_id);
    if (!room) {
        console.warn(`[RustRoomClient] Room not found: ${msg.room_id}`);
        return;
    }

    // 同步 PhysicsComp 的 serverTick，供 Ping 等接口返回正确 tick
    const physicsComp = room.get(PhysicsComp);
    if (physicsComp) {
        physicsComp.serverTick = msg.tick;
    }

    // 转换 Rust 快照格式为客户端协议格式
    // 确保发给客户端的数据字段完整，避免 ParseServerOutputError
    const sanitizedCoins = normalizedCoins
        .map(coin => ({
            id: coin.id,
            p: coin.p,
            r: coin.r
        }))
        .filter(c => Number.isFinite(c.id) && c.p && c.r);

    const clientSnapshot = {
        serverTick: msg.tick,
        pushZ: msg.push_z,
        pushSpeed: msg.push_velocity,
        coins: sanitizedCoins,
        // 如果有收集事件，标记为 removed
        removed: msg.events
            .filter(e => e.kind === 'CoinCollected')
            .flatMap((e: any) => e.coin_ids)
    };

    console.log(
        `[RustRoomClient] Broadcasting full snapshot -> room=${msg.room_id}, tick=${msg.tick}, coins=${clientSnapshot.coins.length}, removed=${clientSnapshot.removed.length}`
    );

    // 广播给房间内所有客户端
    room.broadcastMsg('game/SyncPhysics', clientSnapshot);

    // 处理收集奖励事件
    const rewardEvents = msg.events.filter(e => e.kind === 'CoinDroppedToReward');
    for (const event of rewardEvents) {
        if (event.kind === 'CoinDroppedToReward') {
            // 🔒 调用Gate Server加币（含限额检查）
            await handleRewardEvent(event.player_id, event.reward_amount);

            // 通知客户端收集成功
            room.broadcastMsg('game/CoinCollected', {
                coinIds: [event.coin_id],
                playerId: event.player_id,
                rewardAmount: event.reward_amount
            });
        }
    }
}

/**
 * 处理 Rust 增量快照 - 应用增量并广播给客户端
 */
async function handleRustDeltaSnapshot(msg: Extract<ToNode, { type: 'DeltaSnapshot' }>) {
    // 🔒 验证增量快照签名（如果启用）
    if (SnapshotValidator.isSignatureEnabled()) {
        // 应用增量到完整状态用于签名验证
        const rustClient = getRustRoomClient();
        const allCoins = rustClient['applyDeltaSnapshot'](msg.room_id, msg);

        const snapshot: SignedSnapshot = {
            tick: msg.tick,
            roomId: msg.room_id,
            pushZ: msg.push_z,
            coins: allCoins,
            events: msg.events,
            timestamp: msg.timestamp || Date.now(),
            signature: msg.signature
        };

        const verification = SnapshotValidator.verifySnapshot(snapshot);
        if (!verification.valid) {
            console.error(`[RustRoomClient] ⚠️ DeltaSnapshot signature verification failed: ${verification.error}`);
            console.error(`[RustRoomClient] Rejecting delta snapshot for room ${msg.room_id}, tick ${msg.tick}`);
            return; // 拒绝处理未签名/签名无效的增量快照
        }
    }

    // 动态导入以避免循环依赖
    const { sr } = require('../../ServerRoom');

    const room = sr.ServerRoomModel.rooms.get(msg.room_id);
    if (!room) {
        console.warn(`[RustRoomClient] Room not found: ${msg.room_id}`);
        return;
    }

    const physicsComp = room.get(PhysicsComp);
    if (physicsComp) {
        physicsComp.serverTick = msg.tick;
    }

    // 应用增量更新到客户端缓存
    const rustClient = getRustRoomClient();
    const allCoins = rustClient['applyDeltaSnapshot'](msg.room_id, msg);

    // 转换为客户端协议格式（发送完整状态）
    const sanitizedCoins = allCoins
        .map(coin => ({
            id: coin.id,
            p: coin.p,
            r: coin.r
        }))
        .filter(c => Number.isFinite(c.id) && c.p && c.r);

    const clientSnapshot = {
        serverTick: msg.tick,
        pushZ: msg.push_z,
        pushSpeed: msg.push_velocity,
        coins: sanitizedCoins,
        // 收集的硬币标记为 removed
        removed: [
            ...msg.removed,
            ...msg.events
                .filter(e => e.kind === 'CoinCollected')
                .flatMap((e: any) => e.coin_ids)
        ]
    };

    console.log(
        `[RustRoomClient] Broadcasting delta snapshot -> room=${msg.room_id}, tick=${msg.tick}, coins=${clientSnapshot.coins.length}, removed=${clientSnapshot.removed.length}`
    );

    // 广播给房间内所有客户端
    room.broadcastMsg('game/SyncPhysics', clientSnapshot);

    // 处理收集奖励事件
    const rewardEvents = msg.events.filter(e => e.kind === 'CoinDroppedToReward');
    for (const event of rewardEvents) {
        if (event.kind === 'CoinDroppedToReward') {
            // 🔒 调用Gate Server加币（含限额检查）
            await handleRewardEvent(event.player_id, event.reward_amount);

            // 通知客户端收集成功
            room.broadcastMsg('game/CoinCollected', {
                coinIds: [event.coin_id],
                playerId: event.player_id,
                rewardAmount: event.reward_amount
            });
        }
    }
}

/**
 * 处理 Rust 的扣费请求
 */
async function handleNeedDeductGold(msg: Extract<ToNode, { type: 'NeedDeductGold' }>) {
    try {
        // 构建带签名的请求
        const enableSignature = process.env.ENABLE_REQUEST_SIGNATURE === 'true';
        const deductRequest = enableSignature
            ? signInternalRequest({
                transactionId: msg.tx_id,
                userId: msg.player_id,
                amount: msg.amount,
                reason: 'room_deduct'
            })
            : {
                __ssoToken: process.env.INTERNAL_SECRET_KEY || 'INTERNAL_SECRET_TOKEN_123',
                transactionId: msg.tx_id,
                userId: msg.player_id,
                amount: msg.amount,
                reason: 'room_deduct'
            };

        // 调用 Gate 服务扣费
        const ret = await gateClient.callApi('internal/DeductGold', deductRequest);

        // 回调 Rust
        const rustClient = getRustRoomClient();
        if (ret.isSucc) {
            if (typeof rustClient['walletResult'] === 'function') { rustClient.walletResult(msg.room_id, msg.player_id, msg.tx_id, true); }
            console.log(`[RustRoomClient] Deducted ${msg.amount} gold from player ${msg.player_id}, remaining: ${ret.res.balance}`);
        } else {
            if (typeof rustClient['walletResult'] === 'function') { rustClient.walletResult(msg.room_id, msg.player_id, msg.tx_id, false); }
            console.warn(`[RustRoomClient] Failed to deduct gold for player ${msg.player_id}: ${ret.err?.message}`);
        }
    } catch (error) {
        console.error('[RustRoomClient] Error handling deduct gold:', error);
        // 失败回调 Rust
        const rustClient = getRustRoomClient();
        if (typeof rustClient['walletResult'] === 'function') { rustClient.walletResult(msg.room_id, msg.player_id, msg.tx_id, false); }
    }
}

// Gate Server Client（用于奖励发放）
const GATE_URL = process.env.GATE_URL || 'http://127.0.0.1:3000';
const gateClient = new HttpClient<ServiceTypeGate>(ServiceProtoGate, {
    server: GATE_URL,
    logger: console
});

/**
 * 🔒 处理奖励事件（含每日限额检查）
 * @param playerId 玩家ID
 * @param amount 奖励金额
 */
async function handleRewardEvent(playerId: PlayerId, amount: number): Promise<void> {
    try {
        // 生成唯一事务ID
        const transactionId = `${playerId}_reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 🔒 构建带签名的请求
        const enableSignature = process.env.ENABLE_REQUEST_SIGNATURE === 'true';
        const addRequest = enableSignature
            ? signInternalRequest({
                transactionId,
                userId: playerId,
                amount,
                reason: 'collect_coin'
            })
            : {
                __ssoToken: process.env.INTERNAL_SECRET_KEY || 'INTERNAL_SECRET_TOKEN_123',
                transactionId,
                userId: playerId,
                amount,
                reason: 'collect_coin'
            };

        // 调用 Gate Server 加币（会自动检查每日限额）
        // @ts-ignore
        const ret = await gateClient.callApi('internal/AddGold', addRequest);

        if (ret.isSucc) {
            console.log(`[RustRoomClient] Reward added: ${amount} gold for ${playerId}, balance: ${ret.res.balance}`);
        } else {
            console.warn(`[RustRoomClient] Reward failed: ${ret.err}`);
        }
    } catch (err) {
        console.error(`[RustRoomClient] Error handling reward:`, err);
    }
}
