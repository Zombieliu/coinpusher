import { InviteRewardConfig } from "../../../../server/gate/bll/InviteSystem";
import { InviteConfigReviewStatus } from "../../../../server/gate/bll/InviteConfigSystem";

export interface ReqGetInviteRewardConfig {
    __ssoToken?: string;
}

export interface ResGetInviteRewardConfig {
    version: number;
    config: InviteRewardConfig;
    updatedAt: number;
    updatedBy: {
        adminId: string;
        username: string;
    };
    reviewer?: {
        adminId: string;
        username: string;
    };
    reviewStatus: InviteConfigReviewStatus;
    comment?: string;
}
