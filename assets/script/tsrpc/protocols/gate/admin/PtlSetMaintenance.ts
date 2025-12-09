export interface ReqSetMaintenance {
    __ssoToken?: string;
    enabled: boolean;
    reason?: string;
    whitelistIps?: string[];
    whitelistUsers?: string[];
}

export interface ResSetMaintenance {
    success: boolean;
    error?: string;
}
