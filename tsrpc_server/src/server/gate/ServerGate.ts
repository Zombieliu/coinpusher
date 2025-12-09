/*
 * @Author: dgflash
 * @Date: 2022-05-06 14:59:29
 * @LastEditors: dgflash
 * @LastEditTime: 2023-08-11 09:15:09
 */
import { ecs } from "../../core/ecs/ECS";
import { GateServerStartComp, GateServerStartSystem } from "./bll/GateServerStart";
import { GateModelComp } from "./model/GateModelComp";

/** 
 * 网关服务器
 * 1、管理玩家帐号登录
 * 2、管理游戏分区服务器组，起到负载均衡的作用
 * 3、管理心跳，如果某个客户端掉线了，那么网关就通知各个服务器去做玩家的下线处理（待扩展）
 */
@ecs.register(`ServerGate`)
export class ServerGate extends ecs.Entity {
    GateModel!: GateModelComp;

    protected init() {
        this.addComponents<ecs.Comp>(
            GateModelComp);
    }

    /** 开启网关服务器 */
    start() {
        this.add(GateServerStartComp);
    }
}

export class EcsGateSystem extends ecs.System {
    constructor() {
        super();

        this.add(new GateServerStartSystem());
    }
}