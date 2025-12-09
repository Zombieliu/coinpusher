export interface ReqGetConfig {
    __ssoToken?: string;
    configType: string;
}

export interface ResGetConfig {
    configType: string;
    config: any;
    version: number;
    lastUpdatedAt: number;
    lastUpdatedBy?: string;
}
