import { ApiCall } from "tsrpc";
import { ReqShare, ResShare } from "../../../tsrpc/protocols/gate/PtlShare";
import { ShareSystem } from "../bll/ShareSystem";

/**
 * 分享API
 */
export async function ApiShare(call: ApiCall<ReqShare, ResShare>) {
    try {
        const { userId, type, channel, metadata } = call.req;

        // 创建分享
        const result = await ShareSystem.share(userId, type, channel, metadata);

        if (!result.success) {
            call.error(result.error || "分享失败");
            return;
        }

        call.succ({
            success: true,
            shareId: result.shareId!,
            content: result.content!,
            reward: result.reward
        });
    } catch (error) {
        console.error('[ApiShare] Error:', error);
        call.error("分享失败");
    }
}
