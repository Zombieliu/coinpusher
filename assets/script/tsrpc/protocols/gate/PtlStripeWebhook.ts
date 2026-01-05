export interface ReqStripeWebhook {
    /** 原始请求体字符串（用于签名校验） */
    rawBody?: string;
    /** Stripe-Signature 头 */
    signature?: string;
    /** 解析后的载荷（可选，用于 fallback） */
    payload?: any;
}

export interface ResStripeWebhook {
    success: boolean;
    error?: string;
}
