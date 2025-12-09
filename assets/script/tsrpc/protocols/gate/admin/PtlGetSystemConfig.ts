export interface ReqGetSystemConfig {
    __ssoToken?: string;
    key: string;
}

export interface ResGetSystemConfig {
    success: boolean;
    value?: any;
    error?: string;
}
