export interface ReqGetSystemMetrics {
    __ssoToken?: string;
}

export interface ResGetSystemMetrics {
    success: boolean;
    server?: {
        cpu: { usage: number; cores: number; loadAverage: number[] };
        memory: { total: number; used: number; free: number; usage: number };
        requests: { qps: number; avgResponseTime: number; errorRate: number };
    };
    business?: {
        users: { online: number; dau: number; newToday: number };
        game: { activeMatches: number; totalMatches: number };
        revenue: { todayRevenue: number; orderCount: number };
        errors: { gameErrors: number; paymentErrors: number; serverErrors: number };
    };
    error?: string;
}
