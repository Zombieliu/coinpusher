import { MailReward } from '../../../server/gate/bll/MailSystem';

export interface ReqClaimMailReward {
    userId: string;
    mailId: string;
}

export interface ResClaimMailReward {
    success: boolean;
    rewards?: MailReward;
    error?: string;
}
