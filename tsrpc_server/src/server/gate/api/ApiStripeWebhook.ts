import { ApiCall } from "tsrpc";
import { ReqStripeWebhook, ResStripeWebhook } from "../../tsrpc/protocols/gate/PtlStripeWebhook";
import { PaymentSystem } from "../bll/PaymentSystem";

/**
 * Stripe Webhook 接口
 * 说明：
 * - 优先使用请求头中的 stripe-signature 做签名校验
 * - rawBody 若无法自动获取，可由前置代理传递到 rawBody 字段
 */
export async function ApiStripeWebhook(call: ApiCall<ReqStripeWebhook, ResStripeWebhook>) {
    // 简易速率限制（IP级别，低容量，防爆刷）
    const ip = (call.conn as any)?.httpReq?.socket?.remoteAddress || 'unknown';
    if (!ApiStripeWebhook.rateLimiter.allow(ip)) {
        call.error('Too Many Requests');
        return;
    }

    try {
        const signature = (call.conn as any)?.httpReq?.headers?.['stripe-signature'] as string
            || call.req.signature;

        const rawBody = call.req.rawBody
            || (call.conn as any)?.rawBodyString
            || (call.req.payload ? JSON.stringify(call.req.payload) : JSON.stringify(call.req));

        if (!rawBody) {
            call.error('Missing raw body for webhook; please ensure proxy disables request buffering and preserves body');
            return;
        }

        const result = await PaymentSystem.handleStripeWebhook(rawBody, signature);

        if (!result.success) {
            call.succ({ success: false, error: result.error });
            return;
        }

        call.succ({ success: true });
    } catch (error: any) {
        console.error('[ApiStripeWebhook] Error:', error);
        call.error('Webhook 处理失败');
    }
}

// 轻量IP限流器
ApiStripeWebhook.rateLimiter = new (class {
    private hits: Map<string, { count: number; ts: number }> = new Map();
    private WINDOW = 10_000; // 10秒
    private LIMIT = 30;      // 10秒30次
    allow(key: string): boolean {
        const now = Date.now();
        const entry = this.hits.get(key) || { count: 0, ts: now };
        if (now - entry.ts > this.WINDOW) {
            entry.count = 0;
            entry.ts = now;
        }
        entry.count += 1;
        this.hits.set(key, entry);
        return entry.count <= this.LIMIT;
    }
})();
