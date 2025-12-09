/*
 * @Author: dgflash
 * @Date: 2022-05-16 14:44:44
 * @LastEditors: dgflash
 * @LastEditTime: 2022-08-23 16:08:07
 */
import { ApiCall } from "tsrpc";
import { ReqRoomChat, ResRoomChat } from "../../../tsrpc/protocols/room/PtlRoomChat";
import { RoomConnection } from "../model/ServerRoomModelComp";
import { ApiTimer, recordApiError } from "../../utils/MetricsCollector";

const ENDPOINT = 'room/RoomChat';

/** 房间内聊天 */
export async function ApiRoomChat(call: ApiCall<ReqRoomChat, ResRoomChat>) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    const conn = call.conn as RoomConnection;
    const room = conn.room;

    try {
        room.broadcastMsg(`server/Chat`, {
            time: new Date,
            roleInfo: conn.role.RoleModel.info,
            content: call.req.content
        });

        call.succ({});
        success = true;
    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'room_chat_error');
        call.error('Failed to send chat');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
