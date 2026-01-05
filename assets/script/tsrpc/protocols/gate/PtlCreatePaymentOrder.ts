import { PaymentChannel, PaymentOrder } from '../../types/payment';

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
