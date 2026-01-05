import { ApiCall } from "tsrpc";
import { ReqCreatePaymentOrder, ResCreatePaymentOrder } from "../../../tsrpc/protocols/gate/PtlCreatePaymentOrder";
import { PaymentSystem } from "../bll/PaymentSystem";

/**
 * 创建支付订单API
 */
export async function ApiCreatePaymentOrder(call: ApiCall<ReqCreatePaymentOrder, ResCreatePaymentOrder>) {
    // 简易速率限制：同 IP 10 秒内最多 10 次
    const ip = (call.conn as any)?.httpReq?.socket?.remoteAddress || 'unknown';
    if (!ApiCreatePaymentOrder.rateLimiter.allow(ip)) {
        call.error('Too Many Requests');
        return;
    }

    try {
        const { userId, productId, channel } = call.req;

        // 创建订单
        const result = await PaymentSystem.createOrder(userId, productId, channel);

        if (!result.success) {
            call.error(result.error || "创建订单失败");
            return;
        }

        call.succ({
            success: true,
            order: result.order
        });
    } catch (error) {
        console.error('[ApiCreatePaymentOrder] Error:', error);
        call.error("创建支付订单失败");
    }
}

// 轻量IP限流器
ApiCreatePaymentOrder.rateLimiter = new (class {
    private hits: Map<string, { count: number; ts: number }> = new Map();
    private WINDOW = 10_000; // 10秒
    private LIMIT = 10;      // 10秒10次
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
