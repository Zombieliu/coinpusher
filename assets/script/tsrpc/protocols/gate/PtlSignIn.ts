import { SignInReward } from '../../../server/gate/bll/SignInSystem';

export interface ReqSignIn {
    userId: string;
}

export interface ResSignIn {
    success: boolean;
    error?: string;
    reward?: SignInReward;
    consecutiveDays?: number;
    totalDays?: number;
}
