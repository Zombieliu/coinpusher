import { BaseRequest, BaseResponse, BaseConf } from "../base";

/**
 * 收集金币
 */
export interface ReqCollectCoin extends BaseRequest {
    /** 用户ID */
    userId: string;
    /** 收集的金币数量 */
    amount: number;
}

export interface ResCollectCoin extends BaseResponse {
    /** 当前金币总数 */
    currentGold: number;
}

export const conf: BaseConf = {}
