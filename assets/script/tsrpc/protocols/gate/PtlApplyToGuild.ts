export interface ReqApplyToGuild {
    guildId: string;
    message?: string;
}

export interface ResApplyToGuild {
    success: boolean;
    error?: string;
    applicationId?: string;
}
