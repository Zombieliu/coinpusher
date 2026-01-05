import { ApiCall } from "tsrpc";
import { ReqGetFriendList, ResGetFriendList } from "../../../tsrpc/protocols/gate/PtlGetFriendList";
import { SocialSystem } from "../bll/SocialSystem";

export default async function (call: ApiCall<ReqGetFriendList, ResGetFriendList>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }

    const friends = await SocialSystem.getFriendList(userId);
    const pending = await SocialSystem.getReceivedRequests(userId);

    call.succ({
        friends,
        pendingRequests: pending
    });
}
