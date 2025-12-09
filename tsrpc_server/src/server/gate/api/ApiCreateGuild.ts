import { ApiCall } from "tsrpc";
import { ReqCreateGuild, ResCreateGuild } from "../../../tsrpc/protocols/gate/PtlCreateGuild";

export default async function (call: ApiCall<ReqCreateGuild, ResCreateGuild>) {
    // TODO
    call.error('API Not Implemented');
}