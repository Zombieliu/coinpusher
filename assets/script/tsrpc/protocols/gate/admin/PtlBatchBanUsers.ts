export interface ReqBatchBanUsers {
    __ssoToken?: string;
    userIds: string[];
    reason: string;
    duration: number;
}

export interface ResBatchBanUsers {
    success: boolean;
    successCount: number;
    failedCount: number;
    details: Array<{
        userId: string;
        success: boolean;
        message?: string;
    }>;
}
