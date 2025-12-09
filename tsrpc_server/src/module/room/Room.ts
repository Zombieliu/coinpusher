/*
 * @Author: dgflash
 * @Date: 2022-05-12 14:18:40
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-14 14:48:20
 */
import { PrefixLogger } from "tsrpc";
import { ecs } from "../../core/ecs/ECS";
import { RoomConnection } from "../../server/room/model/ServerRoomModelComp";
import { sr } from "../../ServerRoom";
import { ServiceType } from "../../tsrpc/protocols/ServiceProtoRoom";
import { RoleDetailed, RolePosition, RoleRotation } from "../../tsrpc/types/RoleState";
import { DbUser } from "../account/bll/User";
import { BattleBridge } from "../battle/common/bll/BattleBridge";
import { TableBuff } from "../common/table/TableBuff";
import { TableSkill } from "../common/table/TableSkill";
import { BattlefieldEnterComp, BattlefieldEnterSystem } from "./bll/BattlefieldEnter";
import { RoomBroadcastRoleStateComp, RoomBroadcastRoleStateSystem } from "./bll/RoomBroadcastRoleState";
import { RoomRoleUtil } from "./bll/RoomRoleUtil";
import { PhysicsComp } from "../../server/room/bll/physics/PhysicsComp";
import { PhysicsSystem } from "../../server/room/bll/physics/PhysicsSystem";
import { BattlefieldModelComp } from "./model/BattlefieldModelComp";
import { RoomModelComp } from "./model/RoomModelComp";

/** 
 * 游戏房间 
 * ...
 */
@ecs.register(`Room`)
export class Room extends ecs.Entity {
    RoomModel!: RoomModelComp;
    BattlefieldModel!: BattlefieldModelComp;
    Physics!: PhysicsComp; // Add Physics component

    get logger(): PrefixLogger {
        return this.RoomModel.logger;
    }

    protected init() {
        this.addComponents<ecs.Comp>(
            RoomModelComp,
            RoomBroadcastRoleStateComp,
            BattlefieldModelComp,
            BattlefieldEnterComp,
            PhysicsComp // Add Physics component
        );

        BattleBridge.roles = this.RoomModel.members;
    }

    destroy(): void {
        // 释放物理世界资源
        if (this.Physics && this.Physics.world) {
            this.Physics.world.world.free();
            this.Physics.world = null;
        }

        this.remove(RoomBroadcastRoleStateComp);
        super.destroy();
    }

    /** 向房间内所有连接广播消息 */
    broadcastMsg<T extends keyof ServiceType['msg']>(
        msg: T,
        payload: any
    ): void {
        for (const conn of this.RoomModel.conns) {
            conn.sendMsg(msg as any, payload as any);
        }
    }

    /** 将玩家加入房间 */
    addRole(conn: RoomConnection, user: DbUser): RoleDetailed {
        return RoomRoleUtil.addRole(this, conn, user);
    }

    /** 将玩家移出房间 */
    removeRole(conn: RoomConnection): void {
        RoomRoleUtil.removeRole(conn);
    }

    /** 添加 NPC */
    addNpc(nickname: string, pos: RolePosition, rotation: RoleRotation): void {
        RoomRoleUtil.addNpc(this, nickname, pos, rotation);
    }
}

export class EcsRoomSystem extends ecs.System {
    constructor() {
        super();

        TableSkill.load();
        TableBuff.load();

        this.add(new RoomBroadcastRoleStateSystem());
        this.add(new BattlefieldEnterSystem());
        this.add(new PhysicsSystem()); // Add Physics system
    }
}
