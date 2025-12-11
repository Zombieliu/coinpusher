import { InviteRewardConfig } from "../../../../server/gate/bll/InviteSystem";
import { InviteConfigReviewStatus } from "../../../../server/gate/bll/InviteConfigSystem";

export interface ReqUpdateInviteRewardConfig {
    __ssoToken?: string;
    config: InviteRewardConfig;
    comment?: string;
    reviewerId?: string;
    reviewerName?: string;
    reviewStatus?: InviteConfigReviewStatus;
}

export interface ResUpdateInviteRewardConfig {
    success: boolean;
    version: number;
    status: InviteConfigReviewStatus;
    updatedAt: number;
}
