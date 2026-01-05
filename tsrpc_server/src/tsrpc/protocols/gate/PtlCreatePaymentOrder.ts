import { PaymentChannel, PaymentOrder } from '../../../server/gate/bll/PaymentSystem';
import { BaseRequest, BaseResponse } from "../base";

export interface ReqCreatePaymentOrder extends BaseRequest {
    userId: string;
    productId: string;
    channel: PaymentChannel;
}

export interface ResCreatePaymentOrder extends BaseResponse {
    success: boolean;
    error?: string;
    order?: PaymentOrder;
}
