import { PaymentChannel, PaymentOrder } from '../../../server/gate/bll/PaymentSystem';

export interface ReqCreatePaymentOrder {
    userId: string;
    productId: string;
    channel: PaymentChannel;
}

export interface ResCreatePaymentOrder {
    success: boolean;
    error?: string;
    order?: PaymentOrder;
}
