import { ApiCall } from "tsrpc";
import { ReqExpandInventory, ResExpandInventory } from "../../../tsrpc/protocols/gate/PtlExpandInventory";
import { InventorySystem } from "../bll/InventorySystem";

/**
 * 扩展背包容量API
 */
export async function ApiExpandInventory(call: ApiCall<ReqExpandInventory, ResExpandInventory>) {
    try {
        const { userId } = call.req;

        // 扩展背包
        const result = await InventorySystem.expandInventory(userId);

        if (!result.success) {
            call.error(result.error || "扩展背包失败");
            return;
        }

        call.succ({
            success: true,
            newMaxSlots: result.newMaxSlots!,
            cost: result.cost!
        });
    } catch (error) {
        console.error('[ApiExpandInventory] Error:', error);
        call.error("扩展背包失败");
    }
}
