export interface ReqGuildDonate {
    amount: number;
}

export interface ResGuildDonate {
    success: boolean;
    error?: string;
    contribution?: number;
    guildExp?: number;
}
