/** 物理状态同步消息（增量同步优化版） */
export interface MsgSyncPhysics {
    /** 服务器世界时钟 (tick 计数器) - 用于客户端时间同步 */
    serverTick: number;

    /** 推板 Z 轴位置 */
    pushZ: number;

    /** 有变化的金币列表（增量更新） - 只包含新增或状态变化的硬币 */
    coins: {
        id: number;
        /** 位置 [x, y, z] */
        p: { x: number, y: number, z: number };
        /** 旋转 [x, y, z, w] */
        r: { x: number, y: number, z: number, w: number };
    }[];

    /** 被移除的金币ID列表（已掉落/收集） */
    removed?: number[];
}
