import { ApiCall } from "tsrpc";
import { ReqGetSeasonInfo, ResGetSeasonInfo } from "../../../tsrpc/protocols/gate/PtlGetSeasonInfo";

export default async function (call: ApiCall<ReqGetSeasonInfo, ResGetSeasonInfo>) {
    // TODO
    call.error('API Not Implemented');
}