export type ScheduledJobType = 'announcement' | 'reward' | 'webhook' | 'leaderboard_reward';

export interface ReqCreateScheduledJob {
    __ssoToken?: string;
    type: ScheduledJobType;
    runAt: number; // timestamp ms
    payload: any;
    note?: string;
    maxRetries?: number;
    retryDelay?: number; // ms
}

export interface ResCreateScheduledJob {
    success: boolean;
    jobId?: string;
    message?: string;
}
