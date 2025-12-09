export interface ReqGetActiveAlerts {
    __ssoToken?: string;
}

export interface ResGetActiveAlerts {
    success: boolean;
    alerts?: {
        id: string;
        type: string;
        level: 'info' | 'warning' | 'critical';
        title: string;
        message: string;
        value: number;
        threshold: number;
        timestamp: number;
    }[];
    error?: string;
}
