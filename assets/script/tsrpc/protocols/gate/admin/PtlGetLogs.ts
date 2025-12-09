export interface ReqGetLogs {
    __ssoToken?: string;
    type: string;
    startTime?: number;
    endTime?: number;
    userId?: string;
    page?: number;
    limit?: number;
}

export interface ResGetLogs {
    logs: Array<{
        logId: string;
        type: string;
        userId?: string;
        action: string;
        details: any;
        timestamp: number;
    }>;
    total: number;
    page?: number;
    limit?: number;
}
