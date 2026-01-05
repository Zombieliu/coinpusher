import { ApiCall } from "tsrpc";
import { ReqSendFriendRequest, ResSendFriendRequest } from "../../../tsrpc/protocols/gate/PtlSendFriendRequest";
import { SocialSystem } from "../bll/SocialSystem";
import { RiskGuard } from "../../utils/RiskGuard";

export default async function (call: ApiCall<ReqSendFriendRequest, ResSendFriendRequest>) {
    const fromUserId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!fromUserId) {
        call.error('缺少 userId');
        return;
    }

    const ip = (call.conn as any)?.httpReq?.socket?.remoteAddress;
    const deviceId = (call.req as any).deviceId || (call.conn as any)?.httpReq?.headers?.['x-device-id'];
    const risk = RiskGuard.assess({ ip, deviceId, userId: fromUserId }, 'friend_req');
    if (!risk.ok) {
        call.error(risk.error || 'risk_blocked');
        return;
    }
    if (!(await RiskGuard.allow({ ip, deviceId, userId: fromUserId }, 'friend_req'))) {
        call.error('too_many_requests');
        return;
    }

    const res = await SocialSystem.sendFriendRequest(fromUserId, call.req.toUserId, call.req.message, { ip, deviceId });
    call.succ(res);
}
