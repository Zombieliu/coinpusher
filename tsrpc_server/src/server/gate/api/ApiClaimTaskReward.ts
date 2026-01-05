import { ApiCall } from "tsrpc";
import { ReqClaimTaskReward, ResClaimTaskReward } from "../../../tsrpc/protocols/gate/PtlClaimTaskReward";
import { TaskSystem } from "../bll/TaskSystem";
import { RiskGuard } from "../../utils/RiskGuard";

export default async function (call: ApiCall<ReqClaimTaskReward, ResClaimTaskReward>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }
    const ip = (call.conn as any)?.httpReq?.socket?.remoteAddress;
    const deviceId = (call.conn as any)?.httpReq?.headers?.['x-device-id'];
    const risk = RiskGuard.assess({ ip, deviceId, userId }, 'claim_task');
    if (!risk.ok) {
        call.error(risk.error || 'risk_blocked');
        return;
    }
    if (!(await RiskGuard.allow({ ip, deviceId, userId }, 'claim_task'))) {
        call.error('too_many_requests');
        return;
    }

    const result = await TaskSystem.claimTaskReward(userId, call.req.taskId, { ip, deviceId });
    call.succ(result);
}
