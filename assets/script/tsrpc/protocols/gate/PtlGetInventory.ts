import { BaseRequest, BaseResponse } from '../base';

export interface ReqGetInventory extends BaseRequest {
    userId: string;
}

export interface ResGetInventory extends BaseResponse {
    inventory: Array<{
        itemId: string;
        itemName: string;
        itemType: string;
        rarity: string;
        quantity: number;
        obtainedAt: number;
    }>;
    tickets: number;
    totalItems: number;
}

export const conf = {
    needLogin: true
};
