export interface InviteRewardConfig {
    rewardId: string;
    description?: string;
    gold?: number;
    tickets?: number;
    vipDays?: number;
}

export interface InviteStats {
    invitedCount: number;
    rewardClaimed?: number;
    latestInviteAt?: number;
}
