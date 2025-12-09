import { ApiCall } from "tsrpc";
import { ReqAcceptInvite, ResAcceptInvite } from "../../../tsrpc/protocols/gate/PtlAcceptInvite";
import { InviteSystem } from "../bll/InviteSystem";

/**
 * 接受邀请API
 */
export async function ApiAcceptInvite(call: ApiCall<ReqAcceptInvite, ResAcceptInvite>) {
    try {
        const { userId, inviteCode } = call.req;

        // 接受邀请
        const result = await InviteSystem.acceptInvite(userId, inviteCode);

        if (!result.success) {
            call.error(result.error || "接受邀请失败");
            return;
        }

        call.succ({
            success: true
        });
    } catch (error) {
        console.error('[ApiAcceptInvite] Error:', error);
        call.error("接受邀请失败");
    }
}
