import { BaseRequest, BaseResponse } from '../base';

export interface ReqGetJackpotProgress extends BaseRequest {
    userId: string;
}

export interface ResGetJackpotProgress extends BaseResponse {
    jackpotProgress: number;     // 当前进度（0-100）
    threshold: number;           // 触发阈值
    totalDrops: number;          // 总投币次数
    progressPerDrop: number;     // 每次投币增加的进度
    estimatedDropsToJackpot: number;  // 预计还需投币次数
}

export const conf = {
    needLogin: true
};
