import { ApiCall } from "tsrpc";
import { ReqGetGuildInfo, ResGetGuildInfo } from "../../../tsrpc/protocols/gate/PtlGetGuildInfo";

export default async function (call: ApiCall<ReqGetGuildInfo, ResGetGuildInfo>) {
    // TODO
    call.error('API Not Implemented');
}