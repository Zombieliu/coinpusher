import { GuildData, GuildBenefits } from '../../../server/gate/bll/GuildSystem';

export interface ReqGetGuildInfo {
    guildId?: string;  // 可选，不传则获取自己的公会
}

export interface ResGetGuildInfo {
    guild: GuildData | null;
    benefits?: GuildBenefits;
}
