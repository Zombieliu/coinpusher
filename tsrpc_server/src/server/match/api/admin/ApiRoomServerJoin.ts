import { ApiCall } from "tsrpc";
import { sm } from "../../../../ServerMatch";
import { ReqRoomServerJoin, ResRoomServerJoin } from "../../../../tsrpc/protocols/match/admin/PtlRoomServerJoin";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'match/admin/RoomServerJoin';

/** 加入房间服务器进入工作状态 */
export async function ApiRoomServerJoin(call: ApiCall<ReqRoomServerJoin, ResRoomServerJoin>) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        console.log(`[Match][RoomJoin] Incoming request from ${call.conn.ip} => ${call.req.serverUrl}`);
        sm.joinRoomServer(call);
        success = true;
        console.log(`[Match][RoomJoin] Queued room server ${call.req.serverUrl}`);
    } catch (error: any) {
        console.error(`[Match][RoomJoin] Failed to register ${call.req.serverUrl}:`, error);
        recordApiError('POST', ENDPOINT, error?.message || 'room_server_join_error');
        throw error;
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
