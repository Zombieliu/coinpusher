import { ScheduledJobType } from "./PtlCreateScheduledJob";

export interface ReqListScheduledJobs {
    __ssoToken?: string;
    status?: 'pending' | 'running' | 'done' | 'failed';
}

export interface ResListScheduledJobs {
    jobs: ScheduledJobSummary[];
}

export interface ScheduledJobSummary {
    jobId: string;
    type: ScheduledJobType;
    runAt: number;
    status: 'pending' | 'running' | 'done' | 'failed';
    createdBy?: string;
    createdAt?: number;
    note?: string;
    lastError?: string;
    executedAt?: number;
    retryCount?: number;
    maxRetries?: number;
    retryDelay?: number;
    logs?: ScheduledJobLog[];
}

export interface ScheduledJobLog {
    result: 'success' | 'failed';
    message?: string;
    executedAt: number;
    duration?: number;
    attempt: number;
    httpStatus?: number;
    url?: string;
    method?: string;
    requestBodyPreview?: string;
    responseBodyPreview?: string;
    details?: any;
}
