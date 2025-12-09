import { ApiCall } from "tsrpc";
import { ReqReportRoomStatus, ResReportRoomStatus } from "../../../../tsrpc/protocols/match/admin/PtlReportRoomStatus";
import { RoomServerManager } from "../../bll/RoomServerManager";

export async function ApiReportRoomStatus(call: ApiCall<ReqReportRoomStatus, ResReportRoomStatus>) {
    RoomServerManager.instance.updateStatus(call.req.serverId, {
        roomCount: call.req.roomCount,
        userCount: call.req.userCount,
        cpuUsage: call.req.cpuUsage
    });
    
    call.succ({});
}
