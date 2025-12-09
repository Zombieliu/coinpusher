import { ApiCall } from "tsrpc";
import { ReqClaimSeasonReward, ResClaimSeasonReward } from "../../../tsrpc/protocols/gate/PtlClaimSeasonReward";

export default async function (call: ApiCall<ReqClaimSeasonReward, ResClaimSeasonReward>) {
    // TODO
    call.error('API Not Implemented');
}