export interface ReqUnbanUser {
    __ssoToken?: string;
    userId: string;
}

export interface ResUnbanUser {
    success: boolean;
    message?: string;
}
