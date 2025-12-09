import { ApiCall } from "tsrpc";
import { ReqRegisterRoomServer, ResRegisterRoomServer } from "../../../../tsrpc/protocols/match/admin/PtlRegisterRoomServer";
import { RoomServerManager } from "../../bll/RoomServerManager";

export async function ApiRegisterRoomServer(call: ApiCall<ReqRegisterRoomServer, ResRegisterRoomServer>) {
    RoomServerManager.instance.register({
        serverId: call.req.serverId,
        url: call.req.url,
        roomCount: 0,
        userCount: 0,
        cpuUsage: 0,
        lastHeartbeat: Date.now()
    });
    
    call.succ({});
}
