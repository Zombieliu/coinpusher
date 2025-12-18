import { ScheduledJobLog } from './PtlListScheduledJobs';

export interface ReqGetScheduledJobLogs {
    __ssoToken?: string;
    jobId: string;
    page?: number;
    limit?: number;
}

export interface ResGetScheduledJobLogs {
    logs: ScheduledJobLog[];
    total: number;
}
