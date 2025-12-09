export interface ReqGetLiveLogs {
    __ssoToken?: string;
    lines?: number;
    grep?: string; // 过滤关键词
}

export interface ResGetLiveLogs {
    success: boolean;
    logs?: string[];
    error?: string;
}
