import { ApiCall } from "tsrpc";
import { ReqGetInviteInfo, ResGetInviteInfo } from "../../../tsrpc/protocols/gate/PtlGetInviteInfo";
import { InviteSystem } from "../bll/InviteSystem";

/**
 * 获取邀请信息API
 */
export async function ApiGetInviteInfo(call: ApiCall<ReqGetInviteInfo, ResGetInviteInfo>) {
    try {
        const { userId } = call.req;

        // 获取邀请信息（包含邀请码）
        const inviteInfo = await InviteSystem.getUserInviteInfo(userId);

        // 获取邀请列表
        const inviteList = await InviteSystem.getInviteList(userId);

        call.succ({
            inviteInfo,
            inviteList
        });
    } catch (error) {
        console.error('[ApiGetInviteInfo] Error:', error);
        call.error("获取邀请信息失败");
    }
}
