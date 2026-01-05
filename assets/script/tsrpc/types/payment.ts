/**
 * Front-end shared payment types (mirrors server/gate/bll/PaymentSystem definitions)
 */
export enum PaymentChannel {
    Wechat = 'wechat',
    Alipay = 'alipay',
    PayPal = 'paypal',
    Stripe = 'stripe',
    Sui = 'sui'
}

export enum OrderStatus {
    Pending = 'pending',
    Paid = 'paid',
    Delivered = 'delivered',
    Cancelled = 'cancelled',
    Refunded = 'refunded',
    Failed = 'failed'
}

export interface PaymentOrder {
    orderId: string;
    userId: string;
    productId: string;
    productName: string;
    amount: number;
    currency: string;
    channel: PaymentChannel;
    channelOrderId?: string;
    paymentUrl?: string;
    status: OrderStatus;
    createdAt: number;
    paidAt?: number;
    deliveredAt?: number;
    refundedAt?: number;
    notifyUrl?: string;
    returnUrl?: string;
    metadata?: any;
}

export interface RefundRequest {
    refundId: string;
    orderId: string;
    userId: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: number;
    processedAt?: number;
    processedBy?: string;
    processedByName?: string;
    channelRefundId?: string;
    adminNote?: string;
    evidenceUrls?: string[];
}
