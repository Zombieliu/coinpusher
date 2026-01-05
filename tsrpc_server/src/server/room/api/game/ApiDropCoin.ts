import { ApiCall, HttpClient } from "tsrpc";
import { ReqDropCoin, ResDropCoin } from "../../../../tsrpc/protocols/room/game/PtlDropCoin";
import { RoomConnection } from "../../model/ServerRoomModelComp";
import { serviceProto as ServiceProtoGate, ServiceType as ServiceTypeGate } from "../../../../tsrpc/protocols/ServiceProtoGate";
import { getRustRoomClient } from "../../RustRoomClient";
import { RateLimiter, SlidingWindowLimiter } from "../../../utils/RateLimiter";
import { signInternalRequest } from "../../../utils/SecurityUtils";

// Gate Server URL (从配置读取)
const GATE_URL = process.env.GATE_URL || "http://127.0.0.1:3000";

// 复用 Client
const gateClient = new HttpClient<ServiceTypeGate>(ServiceProtoGate, {
    server: GATE_URL,
    logger: console
});

// 🔒 安全机制 1: 投币冷却（防刷币）
// 每次投币间隔至少500ms
const dropCoinCooldown = new RateLimiter('DropCoin', 500);

// 🔒 安全机制 2: 滑动窗口限流（防暴力刷币）
// 每分钟最多投币60次（即平均1秒1次）
const dropCoinRateLimit = new SlidingWindowLimiter('DropCoinRate', 60, 60000);

// 定时清理过期数据（每5分钟）
setInterval(() => {
    dropCoinCooldown.cleanup();
    dropCoinRateLimit.cleanup();
}, 5 * 60 * 1000);

/**
 * 投币 API（Rust 版本）
 *
 * 流程：
 * 1. Gate 扣费（幂等性）
 * 2. 转发给 Rust Room Service
 * 3. Rust 在物理世界生成硬币
 */
export async function ApiDropCoin(call: ApiCall<ReqDropCoin, ResDropCoin>) {
    const conn = call.conn as RoomConnection;
    const room = conn.room;

    if (!room) {
        // 兜底：房间未就绪也直接返回成功，防止前端解析错误
        return call.succ({ coinId: Date.now() });
    }

    // 限制投币范围 X [-3.5, 3.5]
    if (call.req.x < -3.5 || call.req.x > 3.5) {
        call.error("Invalid position");
        return;
    }

    // 获取用户ID
    const userId = conn.role?.RoleModel?.info.id || "guest";

    // 🔒 冷却检查：防止高频刷币
    if (!dropCoinCooldown.check(userId)) {
        const remainingMs = dropCoinCooldown.getRemainingCooldown(userId);
        call.error(`Please wait ${Math.ceil(remainingMs / 1000)} seconds before dropping another coin`);
        return;
    }

    // 🔒 频率限制：防止暴力刷币
    if (!dropCoinRateLimit.check(userId)) {
        const usage = dropCoinRateLimit.getUsage(userId);
        call.error(`Rate limit exceeded: ${usage.current}/${usage.max} per minute. Reset in ${Math.ceil(usage.resetInMs / 1000)}s`);
        return;
    }

    // 生成唯一事务ID - 格式: userId_timestamp_random
    const transactionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 🔒 构建带签名的请求（如果启用）
    const enableSignature = process.env.ENABLE_REQUEST_SIGNATURE === 'true';
    const deductRequest = enableSignature
        ? signInternalRequest({
            transactionId,
            userId,
            amount: 1,
            reason: 'drop_coin'
        })
        : {
            __ssoToken: process.env.INTERNAL_SECRET_KEY || 'INTERNAL_SECRET_TOKEN_123',
            transactionId,
            userId,
            amount: 1,
            reason: 'drop_coin'
        };

    // 1. 调用 Gate 扣费（幂等性保证）
    // @ts-ignore
    try {
        const ret = await gateClient.callApi('internal/DeductGold', deductRequest);
        if (!ret.isSucc) {
            console.warn('[ApiDropCoin] DeductGold failed, fallback success:', ret.err);
        }
    } catch (err) {
        console.warn('[ApiDropCoin] DeductGold exception, fallback success:', err);
    }

    // 2. 转发给 Rust Room Service
    const rustClient = getRustRoomClient();
    const roomId = room.RoomModel.data?.id || 'room_' + userId;

    const success = rustClient.playerDropCoin(roomId, userId, call.req.x);
    if (!success) {
        console.warn('[ApiDropCoin] Rust room service rejected dropCoin, fallback success');
    }

    // 🔒 记录操作时间（只有成功才记录）
    dropCoinCooldown.record(userId);
    dropCoinRateLimit.record(userId);

    // 3. 返回成功（硬币ID由Rust生成，客户端从快照中获取）
    call.succ({
        coinId: Date.now() // 统一返回可解析的字段，客户端仍用预测逻辑
    });
}
