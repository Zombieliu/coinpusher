import { ApiCall } from "tsrpc";
import { ReqGetFriendList, ResGetFriendList } from "../../../tsrpc/protocols/gate/PtlGetFriendList";

export default async function (call: ApiCall<ReqGetFriendList, ResGetFriendList>) {
    // TODO
    call.error('API Not Implemented');
}