export interface ReqKickAdminSession {
    __ssoToken?: string;
    token: string;
    kickAllOfAdmin?: boolean;
}

export interface ResKickAdminSession {
    success: boolean;
    kicked?: number;
    message?: string;
}
