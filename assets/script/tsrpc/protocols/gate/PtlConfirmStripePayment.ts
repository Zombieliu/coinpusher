import { PaymentOrder } from '../../types/payment';

export interface ReqConfirmStripePayment {
    /** Stripe Checkout Session ID */
    sessionId: string;
    /** 订单号，可选，主要用于回退匹配 */
    orderId?: string;
}

export interface ResConfirmStripePayment {
    success: boolean;
    error?: string;
    order?: PaymentOrder;
}
