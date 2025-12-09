export interface ReqDeleteEvent {
    __ssoToken?: string;
    eventId: string;
}

export interface ResDeleteEvent {
    success: boolean;
    message?: string;
}
