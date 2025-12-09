import { ApiCall } from "tsrpc";
import { ReqHandleFriendRequest, ResHandleFriendRequest } from "../../../tsrpc/protocols/gate/PtlHandleFriendRequest";

export default async function (call: ApiCall<ReqHandleFriendRequest, ResHandleFriendRequest>) {
    // TODO
    call.error('API Not Implemented');
}