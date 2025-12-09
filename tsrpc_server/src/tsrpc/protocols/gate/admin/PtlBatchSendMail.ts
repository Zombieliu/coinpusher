export interface ReqBatchSendMail {
    __ssoToken?: string;
    userIds: string[];
    title: string;
    content: string;
    rewards?: any;
    expireAt?: number;
}

export interface ResBatchSendMail {
    success: boolean;
    successCount: number;
    failedCount: number;
    details?: Array<{
        userId: string;
        success: boolean;
        message?: string;
    }>;
}
