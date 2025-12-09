export interface ReqGetNotifications {
    __ssoToken?: string;
    since?: number;
    limit?: number;
}

export interface ResGetNotifications {
    notifications: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        data?: any;
        timestamp: number;
        adminName?: string;
    }>;
    hasMore?: boolean;
    listenerCount?: number;
}
