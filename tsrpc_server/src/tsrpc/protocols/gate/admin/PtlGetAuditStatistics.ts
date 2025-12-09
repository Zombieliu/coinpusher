export interface ReqGetAuditStatistics {
    __ssoToken?: string;
    startTime?: number;
    endTime?: number;
}

export interface ResGetAuditStatistics {
    success: boolean;
    data?: {
        totalLogs: number;
        successRate: number;
        topActions: { action: string; count: number }[];
        topAdmins: { adminId: string; adminUsername: string; count: number }[];
        categoryDistribution: { category: string; count: number }[];
    };
    error?: string;
}
