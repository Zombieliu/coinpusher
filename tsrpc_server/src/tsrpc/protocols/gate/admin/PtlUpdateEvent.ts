export interface ReqUpdateEvent {
    __ssoToken?: string;
    eventId: string;
    title?: string;
    description?: string;
    startTime?: number;
    endTime?: number;
    status?: string;
    enabled?: boolean;
    config?: any;
    rewards?: any;
}

export interface ResUpdateEvent {
    success: boolean;
    message?: string;
}
