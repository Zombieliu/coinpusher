export interface ReqDisableCdk {
    __ssoToken?: string;
    code: string; // 可以是code，也可以是batchId
    disableBatch?: boolean; // 是否禁用整个批次
    reason?: string;
}

export interface ResDisableCdk {
    success: boolean;
    error?: string;
    affected?: number;
}
