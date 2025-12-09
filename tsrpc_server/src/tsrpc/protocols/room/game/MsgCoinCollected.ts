/** 金币收集消息 */
export interface MsgCoinCollected {
    /** 被收集的金币 ID 列表 */
    coinIds: number[];
    
    /** 当前用户最新金币总数 */
    currentGold: number;
    
    /** 本次获得的收益 */
    addGold: number;
}
