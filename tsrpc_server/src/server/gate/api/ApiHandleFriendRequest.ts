import { ApiCall } from "tsrpc";
import { ReqHandleFriendRequest, ResHandleFriendRequest } from "../../../tsrpc/protocols/gate/PtlHandleFriendRequest";
import { SocialSystem } from "../bll/SocialSystem";

export default async function (call: ApiCall<ReqHandleFriendRequest, ResHandleFriendRequest>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }

    const { requestId, accept } = call.req;
    const res = accept
        ? await SocialSystem.acceptFriendRequest(userId, requestId)
        : await SocialSystem.rejectFriendRequest(userId, requestId);

    call.succ(res);
}
