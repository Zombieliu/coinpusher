import { BaseRequest, BaseResponse } from '../base';
import { InventoryItem } from '../../../server/gate/data/UserDB';

export interface ReqDrawLottery extends BaseRequest {
    userId: string;
}

export interface ResDrawLottery extends BaseResponse {
    success: boolean;
    item?: {
        itemId: string;
        itemName: string;
        itemType: string;
        rarity: string;
        quantity: number;
    };
    isGuaranteed: boolean;      // 是否保底
    remainingTickets: number;    // 剩余彩票数
    pullStats?: {                // 抽奖统计
        pullsSinceEpic: number;
        pullsSinceLegendary: number;
        totalPulls: number;
    };
}

export const conf = {
    needLogin: true
};
