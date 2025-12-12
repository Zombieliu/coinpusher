export interface ReqProcessRefund {
    __ssoToken?: string;
    refundId: string;
    approved: boolean;
    note?: string;
}

export interface ResProcessRefund {
    success: boolean;
    error?: string;
}
