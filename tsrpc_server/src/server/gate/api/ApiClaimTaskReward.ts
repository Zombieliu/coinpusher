import { ApiCall } from "tsrpc";
import { ReqClaimTaskReward, ResClaimTaskReward } from "../../../tsrpc/protocols/gate/PtlClaimTaskReward";

export default async function (call: ApiCall<ReqClaimTaskReward, ResClaimTaskReward>) {
    // TODO
    call.error('API Not Implemented');
}