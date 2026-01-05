import { ApiCall } from "tsrpc";
import { ReqCheckin, ResCheckin } from "../../../tsrpc/protocols/gate/PtlCheckin";
import { TaskSystem } from "../bll/TaskSystem";
import { RiskGuard } from "../../utils/RiskGuard";

export default async function (call: ApiCall<ReqCheckin, ResCheckin>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }
    const ip = (call.conn as any)?.httpReq?.socket?.remoteAddress;
    const deviceId = (call.conn as any)?.httpReq?.headers?.['x-device-id'];
    const risk = RiskGuard.assess({ ip, deviceId, userId }, 'checkin');
    if (!risk.ok) {
        call.error(risk.error || 'risk_blocked');
        return;
    }
    if (!(await RiskGuard.allow({ ip, deviceId, userId }, 'checkin'))) {
        call.error('too_many_requests');
        return;
    }

    const result = await TaskSystem.checkin(userId, { ip, deviceId });
    const info = await TaskSystem.getCheckinInfo(userId);
    call.succ({
        ...result,
        checkinInfo: info
    });
}
