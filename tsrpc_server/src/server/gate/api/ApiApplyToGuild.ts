import { ApiCall } from "tsrpc";
import { ReqApplyToGuild, ResApplyToGuild } from "../../../tsrpc/protocols/gate/PtlApplyToGuild";
import { GuildSystem } from "../bll/GuildSystem";

export default async function (call: ApiCall<ReqApplyToGuild, ResApplyToGuild>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }
    const ip = (call.conn as any)?.httpReq?.socket?.remoteAddress;
    const deviceId = (call.conn as any)?.httpReq?.headers?.['x-device-id'];

    const res = await GuildSystem.applyToGuild(userId, call.req.guildId, call.req.message, { ip, deviceId });
    call.succ(res);
}
