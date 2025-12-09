/*
 * @Author: dgflash
 * @Date: 2022-05-16 14:42:13
 * @LastEditors: dgflash
 * @LastEditTime: 2022-05-20 23:16:27
 */
import { ApiCall } from "tsrpc";
import { ReqRoomLeave, ResRoomLeave } from "../../../tsrpc/protocols/room/PtlRoomLeave";
import { RoomConnection } from "../model/ServerRoomModelComp";
import { ApiTimer, recordApiError } from "../../utils/MetricsCollector";

const ENDPOINT = 'room/RoomLeave';

/** 请求离开房间 */
export async function ApiRoomLeave(call: ApiCall<ReqRoomLeave, ResRoomLeave>) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    const conn = call.conn as RoomConnection;
    try {
        if (conn.room) {
            conn.role.leave();
        }

        call.succ({});
        success = true;
    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'room_leave_error');
        call.error('Failed to leave room');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
