import { ecs } from "../../../../core/ecs/ECS";
import { Room } from "../../../../module/room/Room";
import { PhysicsComp } from "./PhysicsComp";
import { PhysicsWorld } from "./PhysicsWorld";
import { HttpClient } from "tsrpc";
import { serviceProto as ServiceProtoGate, ServiceType as ServiceTypeGate } from "../../../../tsrpc/protocols/ServiceProtoGate";

const GATE_URL = "http://127.0.0.1:3000";
const gateClient = new HttpClient<ServiceTypeGate>(ServiceProtoGate, {
    server: GATE_URL,
    logger: console
});

const isRustIntegrationEnabled = (() => {
    const raw = process.env.RUST_ROOM_ENABLED;
    if (raw === undefined) {
        return true;
    }
    return raw.toLowerCase() === "true";
})();

export class PhysicsSystem extends ecs.ComblockSystem implements ecs.IEntityEnterSystem, ecs.ISystemUpdate {
    filter(): ecs.IMatcher {
        return ecs.allOf(PhysicsComp);
    }

    async entityEnter(e: Room): Promise<void> {
        const comp = e.get(PhysicsComp);
        const roomId = e.RoomModel.data?.id || 'unknown';

        if (isRustIntegrationEnabled) {
            console.log(`[PhysicsSystem] Rust integration ON, skip local physics for Room ${roomId}`);
            comp.world = null;
            return;
        }
        
        try {
            await PhysicsWorld.waitForInit();
            comp.world = new PhysicsWorld();
            console.log(`[PhysicsSystem] Physics world initialized for Room ${roomId}`);
        } catch (err) {
            console.error(`[PhysicsSystem] Failed to init PhysicsWorld:`, err);
        }
    }

    update(e: Room): void {
        if (isRustIntegrationEnabled) {
            return;
        }

        const comp = e.get(PhysicsComp);
        if (!comp.world) return;

        // 🕐 递增服务端 tick（世界时钟）
        comp.serverTick++;

        // 物理模拟步进
        const result = comp.world.step(comp.FIXED_TIME_STEP);

        // 处理收集逻辑
        if (result.collected.length > 0) {
            const amount = result.collected.length;

            // 假设房间属于第一个玩家 (单机模式)
            // const ownerId = e.RoomModel.members[0]?.id;
            // 暂时 mock
            const ownerId = "guest";

            // 生成唯一事务ID - 基于收集的金币ID列表
            const coinIdsStr = result.collected.sort().join('_');
            const transactionId = `collect_${ownerId}_${comp.serverTick}_${coinIdsStr}`;

            // 异步调用 Gate 加钱 (不阻塞物理循环)
            // @ts-ignore
            gateClient.callApi('internal/AddGold', {
                __ssoToken: 'INTERNAL_SECRET_TOKEN_123', // Pass Internal Token
                transactionId: transactionId,  // ✅ 幂等性保证
                userId: ownerId,
                amount: amount,
                reason: 'collect_coin'
            }).then(ret => {
                if (ret.isSucc) {
                    // 广播收集事件
                    // @ts-ignore
                    e.broadcastMsg('game/CoinCollected', {
                        coinIds: result.collected,
                        currentGold: ret.res.balance,
                        addGold: amount
                    });
                }
            });
        }

        // 定时广播物理快照
        const now = Date.now();
        if (now - comp.lastBroadcastTime >= comp.BROADCAST_INTERVAL) {
            comp.lastBroadcastTime = now;

            // @ts-ignore
            e.broadcastMsg('game/SyncPhysics', {
                serverTick: comp.serverTick,  // ✅ 服务器权威时间戳
                pushZ: Number(comp.world.pushPlatformBody.translation().z.toFixed(2)),
                pushSpeed: comp.world.getPushVelocity(),
                coins: result.coins,           // ✅ 增量更新：只包含有变化的硬币
                removed: result.removed.length > 0 ? result.removed : undefined  // ✅ 被移除的硬币
            });
        }
    }
}
