import { ApiCall } from "tsrpc";
import { ReqGetLeaderboard, ResGetLeaderboard } from "../../../tsrpc/protocols/gate/PtlGetLeaderboard";

export default async function (call: ApiCall<ReqGetLeaderboard, ResGetLeaderboard>) {
    // TODO
    call.error('API Not Implemented');
}