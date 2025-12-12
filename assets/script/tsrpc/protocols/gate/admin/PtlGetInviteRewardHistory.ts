import { InviteConfigReviewStatus, InviteRewardConfigHistory } from "../../../../server/gate/bll/InviteConfigSystem";

export interface ReqGetInviteRewardHistory {
    __ssoToken?: string;
    page?: number;
    limit?: number;
    status?: InviteConfigReviewStatus;
}

export interface ResGetInviteRewardHistory {
    history: InviteRewardConfigHistory[];
    total: number;
    page: number;
    pageSize: number;
}
