import { InviteLeaderboardSort } from "../../../../server/gate/bll/InviteAdminSystem";

export interface ReqExportInviteLeaderboard {
    __ssoToken?: string;
    limit?: number;
    sortBy?: InviteLeaderboardSort;
    search?: string;
}

export interface ResExportInviteLeaderboard {
    fileName: string;
    csvBase64: string;
    generatedAt: number;
    total: number;
}
