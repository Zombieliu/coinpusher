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
        sm.joinRoomServer(call);
        success = true;
    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'room_server_join_error');
        throw error;
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
