import { ApiCall } from "tsrpc";
import { ReqDrawLottery, ResDrawLottery } from "../../../tsrpc/protocols/gate/PtlDrawLottery";
import { LotterySystem } from "../bll/LotterySystem";

/**
 * 抽奖API
 */
export async function ApiDrawLottery(call: ApiCall<ReqDrawLottery, ResDrawLottery>) {
    try {
        // 执行抽奖
        const result = await LotterySystem.drawLottery(call.req.userId);

        if (!result.success) {
            call.error("彩票不足或抽奖失败");
            return;
        }

        // 获取抽奖统计
        const stats = LotterySystem.getUserStats(call.req.userId);

        call.succ({
            success: true,
            item: result.item ? {
                itemId: result.item.itemId,
                itemName: result.item.itemName,
                itemType: result.item.itemType,
                rarity: result.item.rarity,
                quantity: result.item.quantity
            } : undefined,
            isGuaranteed: result.isGuaranteed,
            remainingTickets: result.remainingTickets,
            pullStats: {
                pullsSinceEpic: stats.pullsSinceEpic,
                pullsSinceLegendary: stats.pullsSinceLegendary,
                totalPulls: stats.totalPulls
            }
        });
    } catch (error) {
        console.error('[ApiDrawLottery] Error:', error);
        call.error("抽奖失败");
    }
}
