export interface ReqGetLogAnalytics {
    __ssoToken?: string;
    startTime?: number;
    endTime?: number;
}

export interface ResGetLogAnalytics {
    actionStats: Array<{
        action: string;
        count: number;
        percentage: number;
    }>;
    adminStats: Array<{
        adminId: string;
        adminName?: string;
        operationCount: number;
        lastOperation: number;
    }>;
    timeDistribution: Array<{
        hour: number;
        count: number;
    }>;
    dailyTrend: Array<{
        date: string;
        count: number;
    }>;
    totalOperations: number;
    activeAdmins: number;
    mostCommonAction: string;
}
