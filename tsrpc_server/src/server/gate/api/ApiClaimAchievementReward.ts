import { ApiCall } from "tsrpc";
import { ReqClaimAchievementReward, ResClaimAchievementReward } from "../../../tsrpc/protocols/gate/PtlClaimAchievementReward";

export default async function (call: ApiCall<ReqClaimAchievementReward, ResClaimAchievementReward>) {
    // TODO
    call.error('API Not Implemented');
}