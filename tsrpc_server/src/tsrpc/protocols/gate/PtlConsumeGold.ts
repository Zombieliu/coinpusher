import { BaseRequest, BaseResponse, BaseConf } from "../base";

/**
 * 消耗金币
 */
export interface ReqConsumeGold extends BaseRequest {
    /** 用户ID */
    userId: string;
    /** 消耗的金币数量 */
    amount: number;
}

export interface ResConsumeGold extends BaseResponse {
    /** 当前金币总数 */
    currentGold: number;
}

export const conf: BaseConf = {}
