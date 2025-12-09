export interface ReqUpdateConfig {
    __ssoToken?: string;
    configType: string;
    config: any;
    comment?: string;
}

export interface ResUpdateConfig {
    success: boolean;
    version?: number;
    message?: string;
}
