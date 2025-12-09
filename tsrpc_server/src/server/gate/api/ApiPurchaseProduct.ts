import { ApiCall } from "tsrpc";
import { ReqPurchaseProduct, ResPurchaseProduct } from "../../../tsrpc/protocols/gate/PtlPurchaseProduct";
import { ShopSystem } from "../bll/ShopSystem";

/**
 * 购买商品API
 */
export async function ApiPurchaseProduct(call: ApiCall<ReqPurchaseProduct, ResPurchaseProduct>) {
    try {
        const { userId, productId, quantity } = call.req;

        // 购买商品
        const result = await ShopSystem.purchaseProduct(userId, productId);

        if (!result.success) {
            call.error(result.error || "购买失败");
            return;
        }

        call.succ({
            success: true,
            recordId: result.recordId
        });
    } catch (error) {
        console.error('[ApiPurchaseProduct] Error:', error);
        call.error("购买商品失败");
    }
}
