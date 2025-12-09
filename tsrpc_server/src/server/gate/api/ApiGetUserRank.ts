import { ApiCall } from "tsrpc";
import { ReqGetUserRank, ResGetUserRank } from "../../../tsrpc/protocols/gate/PtlGetUserRank";

export default async function (call: ApiCall<ReqGetUserRank, ResGetUserRank>) {
    // TODO
    call.error('API Not Implemented');
}