import { BaseRequest, BaseResponse } from '../../base';

export interface ReqCollectWithReward extends BaseRequest {
    transactionId: string;       // 事务ID（幂等性）
    userId: string;
    baseAmount: number;          // 基础收集金币数量
}

export interface ResCollectWithReward extends BaseResponse {
    success: boolean;
    baseReward: number;          // 基础奖励
    bonusReward: number;         // 额外奖励（小奖/大奖/超级大奖/Jackpot）
    totalReward: number;         // 总奖励
    tickets: number;             // 获得的彩票数量
    rewardType: string;          // 奖励类型
    rewardMessage: string;       // 奖励消息
    jackpotProgress: number;     // Jackpot进度
    shouldBroadcast: boolean;    // 是否需要全服广播
}

export const conf = {
    needCheckAddress: true      // 内部接口，需要验证
};
