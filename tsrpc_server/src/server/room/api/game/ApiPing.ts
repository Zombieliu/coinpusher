import { ApiCall } from "tsrpc";
import { ReqPing, ResPing } from "../../../../tsrpc/protocols/room/game/PtlPing";
import { RoomConnection } from "../../model/ServerRoomModelComp";
import { PhysicsComp } from "../../bll/physics/PhysicsComp";

/**
 * Ping API - 用于RTT测量和客户端-服务器时间同步
 * 客户端定期调用此接口，获取服务器的tick和时间戳，计算网络延迟
 */
export async function ApiPing(call: ApiCall<ReqPing, ResPing>) {
    const conn = call.conn as RoomConnection;
    const room = conn.room;

    if (!room) {
        call.error("Not in a room");
        return;
    }

    const physics = room.get(PhysicsComp);
    if (!physics) {
        call.error("Physics not ready");
        return;
    }

    // 返回服务器当前状态
    call.succ({
        clientTime: call.req.clientTime,  // 回传客户端时间
        serverTick: physics.serverTick,   // 服务器当前tick
        serverTime: Date.now()             // 服务器当前时间戳
    });
}
