export interface ReqCreateEvent {
    __ssoToken?: string;
    eventType: string;
    title: string;
    description: string;
    startTime: number;
    endTime: number;
    config: any;
    rewards: any;
}

export interface ResCreateEvent {
    success: boolean;
    eventId?: string;
    message?: string;
}
