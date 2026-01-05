import { ApiCall } from "tsrpc";
import { ReqGetGuildInfo, ResGetGuildInfo } from "../../../tsrpc/protocols/gate/PtlGetGuildInfo";
import { GuildSystem } from "../bll/GuildSystem";

export default async function (call: ApiCall<ReqGetGuildInfo, ResGetGuildInfo>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    const guildId = call.req.guildId;

    const guild = guildId
        ? await GuildSystem.getGuild(guildId)
        : (userId ? await GuildSystem.getUserGuild(userId) : null);

    if (!guild) {
        call.succ({ guild: null, benefits: undefined });
        return;
    }

    const benefits = GuildSystem.getGuildBenefits(guild.level);

    call.succ({
        guild,
        benefits
    });
}
