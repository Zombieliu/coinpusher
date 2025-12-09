import { SignInRecord, SignInConfig } from '../../../server/gate/bll/SignInSystem';

export interface ReqGetSignInInfo {
    userId: string;
}

export interface ResGetSignInInfo {
    record: SignInRecord | null;
    todaySigned: boolean;
    canSignIn: boolean;
    nextReward: SignInConfig;
    monthlyCalendar: Array<{ date: number; signed: boolean }>;
}
