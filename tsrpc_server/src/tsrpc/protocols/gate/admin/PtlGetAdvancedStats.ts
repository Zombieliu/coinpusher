export interface ReqGetAdvancedStats {
    __ssoToken?: string;
    type: 'ltv' | 'retention';
    days?: number;
}

export interface ResGetAdvancedStats {
    success: boolean;
    data?: any[]; // 根据类型返回 LTV 或 Retention 数组
    error?: string;
}
