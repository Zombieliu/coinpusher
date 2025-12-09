import { ApiCall } from "tsrpc";
import { ReqUseItem, ResUseItem } from "../../../tsrpc/protocols/gate/PtlUseItem";
import { ItemSystem } from "../bll/ItemSystem";

/**
 * 使用道具API
 */
export async function ApiUseItem(call: ApiCall<ReqUseItem, ResUseItem>) {
    try {
        const { userId, itemId } = call.req;

        // 使用道具
        const result = await ItemSystem.useItem(userId, itemId);

        if (!result.success) {
            call.error(result.error || "使用道具失败");
            return;
        }

        call.succ({
            success: true,
            effect: result.effect,
            buffId: result.buffId
        });
    } catch (error) {
        console.error('[ApiUseItem] Error:', error);
        call.error("使用道具失败");
    }
}
