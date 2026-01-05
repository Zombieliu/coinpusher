import { ApiCall } from "tsrpc";
import { ReqClaimAchievementReward, ResClaimAchievementReward } from "../../../tsrpc/protocols/gate/PtlClaimAchievementReward";
import { AchievementSystem } from "../bll/AchievementSystem";
import { RiskGuard } from "../../utils/RiskGuard";

export default async function (call: ApiCall<ReqClaimAchievementReward, ResClaimAchievementReward>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }
    const ip = (call.conn as any)?.httpReq?.socket?.remoteAddress;
    const deviceId = (call.conn as any)?.httpReq?.headers?.['x-device-id'];
    const risk = RiskGuard.assess({ ip, deviceId, userId }, 'ach_claim');
    if (!risk.ok) {
        call.error(risk.error || 'risk_blocked');
        return;
    }
    if (!(await RiskGuard.allow({ ip, deviceId, userId }, 'ach_claim'))) {
        call.error('too_many_requests');
        return;
    }

    const result = await AchievementSystem.claimAchievementReward(userId, call.req.achievementId, { ip, deviceId });
    call.succ(result);
}
