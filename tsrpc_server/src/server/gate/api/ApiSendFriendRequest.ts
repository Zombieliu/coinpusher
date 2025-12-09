import { ApiCall } from "tsrpc";
import { ReqSendFriendRequest, ResSendFriendRequest } from "../../../tsrpc/protocols/gate/PtlSendFriendRequest";

export default async function (call: ApiCall<ReqSendFriendRequest, ResSendFriendRequest>) {
    // TODO
    call.error('API Not Implemented');
}