/**
 * @file CoinModelComp.ts
 * @description 金币数据模型组件
 *
 * @module coinpusher/model
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 存储金币相关的所有数据：
 * - 玩家链上金币总数
 * - 台面上的金币数量
 * - 金币节点列表
 * - 金币对象池
 */

import { Node } from "cc";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";

@ecs.register("CoinModelComp")
export class CoinModelComp extends ecs.Comp {
    /** 玩家链上金币总数 */
    totalGold: number = 0;

    /** 台面上的金币数量 */
    coinsOnTable: number = 0;

    /** 金币预制体路径 */
    coinPrefabPath: string = "content/coinpusher/coin";

    /** 台面金币列表（Node 引用，不需要序列化） */
    coinNodes: Node[] = [];

    /** 金币对象池（用于复用） */
    coinPool: Node[] = [];

    /** 最大金币数量（性能限制） */
    maxCoins: number = 200;

    /** 重置数据 */
    reset() {
        this.coinsOnTable = 0;
        this.coinNodes = [];
        this.coinPool = [];
    }

    /** 是否已达到最大金币数 */
    get isMaxCoins(): boolean {
        return this.coinsOnTable >= this.maxCoins;
    }
}
