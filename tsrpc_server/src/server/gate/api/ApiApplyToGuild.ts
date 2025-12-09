import { ApiCall } from "tsrpc";
import { ReqApplyToGuild, ResApplyToGuild } from "../../../tsrpc/protocols/gate/PtlApplyToGuild";

export default async function (call: ApiCall<ReqApplyToGuild, ResApplyToGuild>) {
    // TODO
    call.error('API Not Implemented');
}