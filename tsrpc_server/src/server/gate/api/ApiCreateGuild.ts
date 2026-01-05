import { ApiCall } from "tsrpc";
import { ReqCreateGuild, ResCreateGuild } from "../../../tsrpc/protocols/gate/PtlCreateGuild";
import { GuildSystem } from "../bll/GuildSystem";

export default async function (call: ApiCall<ReqCreateGuild, ResCreateGuild>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }
    const ip = (call.conn as any)?.httpReq?.socket?.remoteAddress;
    const deviceId = (call.conn as any)?.httpReq?.headers?.['x-device-id'];

    const { name, tag, description } = call.req;
    const res = await GuildSystem.createGuild(userId, name, tag, description || '', { ip, deviceId });
    call.succ(res);
}
