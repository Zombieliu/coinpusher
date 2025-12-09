import { ApiCall } from "tsrpc";
import { ReqSendFriendGift, ResSendFriendGift } from "../../../tsrpc/protocols/gate/PtlSendFriendGift";

export default async function (call: ApiCall<ReqSendFriendGift, ResSendFriendGift>) {
    // TODO
    call.error('API Not Implemented');
}