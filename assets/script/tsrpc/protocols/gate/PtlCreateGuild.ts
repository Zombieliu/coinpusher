export interface ReqCreateGuild {
    name: string;
    tag: string;
    description?: string;
}

export interface ResCreateGuild {
    success: boolean;
    error?: string;
    guildId?: string;
}
