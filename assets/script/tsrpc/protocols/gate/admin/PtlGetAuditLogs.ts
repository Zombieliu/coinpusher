export interface ReqGetAuditLogs {
    __ssoToken?: string;
    adminId?: string;
    action?: string;
    category?: 'user_management' | 'admin_management' | 'system_config' | 'game_data' | 'financial' | 'security';
    targetId?: string;
    startTime?: number;
    endTime?: number;
    result?: 'success' | 'failed';
    page?: number;
    limit?: number;
}

export interface ResGetAuditLogs {
    success: boolean;
    logs?: {
        logId: string;
        adminId: string;
        adminUsername: string;
        action: string;
        category: string;
        targetType?: string;
        targetId?: string;
        targetName?: string;
        details: any;
        ipAddress: string;
        userAgent?: string;
        result: 'success' | 'failed';
        errorMessage?: string;
        createdAt: number;
    }[];
    total?: number;
    page?: number;
    pageSize?: number;
    error?: string;
}
