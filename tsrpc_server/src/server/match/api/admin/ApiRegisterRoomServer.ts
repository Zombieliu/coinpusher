import { ApiCall } from "tsrpc";
import { ReqRegisterRoomServer, ResRegisterRoomServer } from "../../../../tsrpc/protocols/match/admin/PtlRegisterRoomServer";
import { RoomServerManager } from "../../bll/RoomServerManager";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'match/admin/RegisterRoomServer';

export async function ApiRegisterRoomServer(call: ApiCall<ReqRegisterRoomServer, ResRegisterRoomServer>) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        RoomServerManager.instance.register({
            serverId: call.req.serverId,
            url: call.req.url,
            roomCount: 0,
            userCount: 0,
            cpuUsage: 0,
            lastHeartbeat: Date.now()
        });
        
        call.succ({});
        success = true;
    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'register_room_server_error');
        call.error('Failed to register room server');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
