import { ApiCall } from "tsrpc";
import { ReqClaimSeasonReward, ResClaimSeasonReward } from "../../../tsrpc/protocols/gate/PtlClaimSeasonReward";
import { SeasonSystem } from "../bll/SeasonSystem";

export default async function (call: ApiCall<ReqClaimSeasonReward, ResClaimSeasonReward>) {
    const userId = (call.conn as any)?.userId || 'guest';
    const { level, type } = call.req;

    const result = await SeasonSystem.claimLevelReward(userId, level, type);
    call.succ(result);
}
