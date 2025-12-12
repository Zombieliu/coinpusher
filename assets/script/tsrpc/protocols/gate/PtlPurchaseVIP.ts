import { VIPLevel } from '../../../server/gate/bll/VIPSystem';

export interface ReqPurchaseVIP {
    userId: string;
    vipLevel: VIPLevel;
    duration: number;
}

export interface ResPurchaseVIP {
    success: boolean;
    orderId?: string;
    error?: string;
}
