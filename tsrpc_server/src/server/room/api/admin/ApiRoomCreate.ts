/*
 * @Author: dgflash
 * @Date: 2022-05-16 14:44:44
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-14 13:51:47
 */
import { ApiCall, PrefixLogger } from "tsrpc";
import * as uuid from 'uuid';
import { ecs } from "../../../../core/ecs/ECS";
import { Config } from "../../../../module/config/Config";
import { Room } from "../../../../module/room/Room";
import { sr } from "../../../../ServerRoom";
import { ReqRoomCreate, ResRoomCreate } from "../../../../tsrpc/protocols/room/admin/PtlRoomCreate";
import { getRustRoomClient } from "../../RustRoomClient";

/** 匹配服务器通知创建房间 */
export async function ApiRoomCreate(call: ApiCall<ReqRoomCreate, ResRoomCreate>) {
    let room = ecs.getEntity<Room>(Room);
    let rm = room.RoomModel;

    const roomId = uuid.v4();

    rm.data = {
        id: roomId,
        max: Config.room.max_user_num,
        name: call.req.roomName,
        roles: [],
        npcs: [],
        messages: [],
        timeStartMatch: Date.now(),
        timeUpdate: Date.now()
    };

    /** 房间默认NPC逻辑开始 */
    room.addNpc("靶子1", { x: 10.348768903200611, y: 1.6001317054033297, z: -1.6186361156938958 }, { x: 0, y: 0, z: 0, w: 0 });
    room.addNpc("靶子2", { x: 5.821206395531185, y: 1.5870302174363964, z: 2.969326790016373 }, { x: 0, y: 0, z: 0, w: 0 });
    room.addNpc("靶子3", { x: 0.8674733515101634, y: 1.5793065324363624, z: 8.011606335184727 }, { x: 0, y: 0, z: 0, w: 0 });
    /** 房间默认NPC逻辑结束 */

    rm.logger = new PrefixLogger({
        logger: sr.ServerRoomModel.wssRoom.logger,
        prefixs: [`[Room ${rm.data.id}]`],
    });

    sr.ServerRoomModel.rooms.set(room.RoomModel.data.id, room);

    // ========== Rust Room Service 集成 ==========
    // 在 Rust 端创建对应的物理房间
    const rustClient = getRustRoomClient();
    const roomConfig = {
        gravity: -20.0,
        drop_height: 10.0,
        coin_radius: 0.5,
        coin_height: 0.1,
        reward_line_z: -0.5,
        push_min_z: -8.8,
        push_max_z: -6.0,
        push_speed: 1.5
    };

    rustClient.createRoom(roomId, roomConfig);
    rm.logger.log(`Created Rust room: ${roomId}`);
    // ========================================

    call.succ({
        roomId: room.RoomModel.data.id
    });
}