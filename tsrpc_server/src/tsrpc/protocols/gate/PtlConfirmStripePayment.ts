import { PaymentOrder } from '../../../server/gate/bll/PaymentSystem';
import { BaseRequest, BaseResponse } from "../base";

export interface ReqConfirmStripePayment extends BaseRequest {
    /** Stripe Checkout Session ID */
    sessionId: string;
    /** 订单号，可选，主要用于回退匹配 */
    orderId?: string;
}

export interface ResConfirmStripePayment extends BaseResponse {
    success: boolean;
    error?: string;
    order?: PaymentOrder;
}
