/*
 * @Author: dgflash
 * @Date: 2021-11-18 14:20:46
 * @LastEditors: dgflash
 * @LastEditTime: 2025-12-04
 */
import { ecs } from "../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { Initialize } from "../initialize/Initialize";
import { CoinPusher } from "../coinpusher/CoinPusher";

/** 游戏模块（推金币游戏专用） */
@ecs.register("SingletonModule")
export class SingletonModuleComp extends ecs.Comp {
    /** 游戏初始化模块 */
    initialize: Initialize = null!;
    /** 推金币游戏模块 */
    coinPusher: CoinPusher = null!;

    reset() { }
}

export var smc = ecs.getSingleton(SingletonModuleComp);