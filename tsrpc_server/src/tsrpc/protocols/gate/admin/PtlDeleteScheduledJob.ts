export interface ReqDeleteScheduledJob {
    __ssoToken?: string;
    jobId: string;
}

export interface ResDeleteScheduledJob {
    success: boolean;
    message?: string;
}
