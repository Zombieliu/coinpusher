import { ApiCall } from "tsrpc";
import { ReqCreatePaymentOrder, ResCreatePaymentOrder } from "../../../tsrpc/protocols/gate/PtlCreatePaymentOrder";
import { PaymentSystem } from "../bll/PaymentSystem";

/**
 * 创建支付订单API
 */
export async function ApiCreatePaymentOrder(call: ApiCall<ReqCreatePaymentOrder, ResCreatePaymentOrder>) {
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
