import { InviteLeaderboardSort, InviteLeaderboardEntry } from "../../../../server/gate/bll/InviteAdminSystem";

export interface ReqGetInviteLeaderboard {
    __ssoToken?: string;
    page?: number;
    limit?: number;
    sortBy?: InviteLeaderboardSort;
    search?: string;
}

export interface ResGetInviteLeaderboard {
    list: InviteLeaderboardEntry[];
    total: number;
    page: number;
    pageSize: number;
    summary: {
        totalInvites: number;
        totalRewards: number;
        totalInviters: number;
        todaysNewInvites: number;
    };
    configVersion: number;
}
