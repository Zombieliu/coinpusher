import { ApiCall } from "tsrpc";
import { ReqGuildDonate, ResGuildDonate } from "../../../tsrpc/protocols/gate/PtlGuildDonate";

export default async function (call: ApiCall<ReqGuildDonate, ResGuildDonate>) {
    // TODO
    call.error('API Not Implemented');
}