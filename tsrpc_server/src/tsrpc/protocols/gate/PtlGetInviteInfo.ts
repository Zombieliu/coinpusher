import { InviteStats } from '../../../server/gate/bll/InviteSystem';

export interface ReqGetInviteInfo {
    userId: string;
}

export interface ResGetInviteInfo {
    inviteInfo: InviteStats;
    inviteList: Array<{
        inviteeId: string;
        invitedAt: number;
        rewardGiven: boolean;
    }>;
}
