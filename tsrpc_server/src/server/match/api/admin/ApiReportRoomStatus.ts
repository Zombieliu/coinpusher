import { ApiCall } from "tsrpc";
import { ReqReportRoomStatus, ResReportRoomStatus } from "../../../../tsrpc/protocols/match/admin/PtlReportRoomStatus";
import { RoomServerManager } from "../../bll/RoomServerManager";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'match/admin/ReportRoomStatus';

export async function ApiReportRoomStatus(call: ApiCall<ReqReportRoomStatus, ResReportRoomStatus>) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        RoomServerManager.instance.updateStatus(call.req.serverId, {
            roomCount: call.req.roomCount,
            userCount: call.req.userCount,
            cpuUsage: call.req.cpuUsage
        });
        
        call.succ({});
        success = true;
    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'room_status_error');
        call.error('Failed to update room status');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
