import { ApiCall } from "tsrpc";
import { ReqConfirmStripePayment, ResConfirmStripePayment } from "../../../tsrpc/protocols/gate/PtlConfirmStripePayment";
import { PaymentSystem } from "../bll/PaymentSystem";

/**
 * Stripe 支付结果确认
 * 前端在 Stripe Checkout 成功回调后调用，服务端验证会话并发货
 */
export async function ApiConfirmStripePayment(call: ApiCall<ReqConfirmStripePayment, ResConfirmStripePayment>) {
    try {
        const { sessionId, orderId } = call.req;

        const result = await PaymentSystem.confirmStripePayment(sessionId, orderId);

        if (!result.success) {
            call.succ({
                success: false,
                error: result.error,
                order: result.order
            });
            return;
        }

        call.succ({
            success: true,
            order: result.order
        });
    } catch (error) {
        console.error('[ApiConfirmStripePayment] Error:', error);
        call.error("确认支付失败");
    }
}
