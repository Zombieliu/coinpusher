import { ApiCall } from "tsrpc";
import { ReqClaimMailReward, ResClaimMailReward } from "../../../tsrpc/protocols/gate/PtlClaimMailReward";
import { MailSystem } from "../bll/MailSystem";

export async function ApiClaimMailReward(call: ApiCall<ReqClaimMailReward, ResClaimMailReward>) {
    try {
        const { userId, mailId } = call.req;
        const result = await MailSystem.claimMailReward(userId, mailId);
        call.succ(result);
    } catch (error) {
        console.error('[ApiClaimMailReward] Error:', error);
        call.error("领取邮件奖励失败");
    }
}
