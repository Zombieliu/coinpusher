export interface ReqGetEvents {
    __ssoToken?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export interface ResGetEvents {
    events: Array<{
        eventId: string;
        eventType: string;
        title: string;
        description: string;
        startTime: number;
        endTime: number;
        status: string;
        config: any;
        rewards: any;
    }>;
    total?: number;
    page?: number;
    limit?: number;
}
