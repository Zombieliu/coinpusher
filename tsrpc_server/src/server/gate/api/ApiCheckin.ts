import { ApiCall } from "tsrpc";
import { ReqCheckin, ResCheckin } from "../../../tsrpc/protocols/gate/PtlCheckin";

export default async function (call: ApiCall<ReqCheckin, ResCheckin>) {
    // TODO
    call.error('API Not Implemented');
}