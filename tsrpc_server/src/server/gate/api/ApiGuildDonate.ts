import { ApiCall } from "tsrpc";
import { ReqGuildDonate, ResGuildDonate } from "../../../tsrpc/protocols/gate/PtlGuildDonate";
import { GuildSystem } from "../bll/GuildSystem";

export default async function (call: ApiCall<ReqGuildDonate, ResGuildDonate>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }

    const res = await GuildSystem.donate(userId, call.req.amount);
    call.succ(res);
}
