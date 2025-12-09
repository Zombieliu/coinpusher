export interface ReqBanUser {
    __ssoToken?: string;
    userId: string;
    reason: string;
    duration: number;
}

export interface ResBanUser {
    success: boolean;
    message?: string;
}
