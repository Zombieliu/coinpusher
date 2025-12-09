export interface ReqGetConfigHistory {
    __ssoToken?: string;
    configType: string;
    page?: number;
    limit?: number;
}

export interface ResGetConfigHistory {
    history: Array<{
        historyId: string;
        version: number;
        config: any;
        updatedBy: string;
        updatedAt: number;
        comment: string;
    }>;
    total: number;
    page?: number;
    limit?: number;
}
