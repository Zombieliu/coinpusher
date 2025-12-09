import { ApiCall } from "tsrpc";
import { ReqPurchaseVIP, ResPurchaseVIP } from "../../../tsrpc/protocols/gate/PtlPurchaseVIP";
import { VIPSystem } from "../bll/VIPSystem";

export async function ApiPurchaseVIP(call: ApiCall<ReqPurchaseVIP, ResPurchaseVIP>) {
    try {
        const { userId, vipLevel, duration } = call.req;
        const result = await VIPSystem.purchaseVIP(userId, vipLevel, duration);
        call.succ(result);
    } catch (error) {
        console.error('[ApiPurchaseVIP] Error:', error);
        call.error("购买VIP失败");
    }
}
