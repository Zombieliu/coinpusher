import { ApiCall } from "tsrpc";
import { ReqGetShareStats, ResGetShareStats } from "../../../tsrpc/protocols/gate/PtlGetShareStats";
import { ShareSystem } from "../bll/ShareSystem";

/**
 * 获取分享统计API
 */
export async function ApiGetShareStats(call: ApiCall<ReqGetShareStats, ResGetShareStats>) {
    try {
        const { userId } = call.req;

        // 获取分享统计
        const stats = await ShareSystem.getShareStats(userId);

        // 获取分享历史
        const history = await ShareSystem.getShareHistory(userId);

        call.succ({
            stats,
            history
        });
    } catch (error) {
        console.error('[ApiGetShareStats] Error:', error);
        call.error("获取分享统计失败");
    }
}
