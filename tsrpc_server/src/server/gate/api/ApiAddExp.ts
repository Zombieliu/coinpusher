import { ApiCall } from "tsrpc";
import { ReqAddExp, ResAddExp } from "../../../tsrpc/protocols/gate/PtlAddExp";

export default async function (call: ApiCall<ReqAddExp, ResAddExp>) {
    // TODO
    call.error('API Not Implemented');
}