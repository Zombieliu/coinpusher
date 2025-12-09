export interface ReqRollbackConfig {
    __ssoToken?: string;
    configType: string;
    historyId: string;
}

export interface ResRollbackConfig {
    success: boolean;
    version?: number;
    message?: string;
}
