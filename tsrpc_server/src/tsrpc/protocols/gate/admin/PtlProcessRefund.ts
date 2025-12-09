export interface ReqProcessRefund {
    __ssoToken?: string;
    refundId: string;
    approved: boolean;
}

export interface ResProcessRefund {
    success: boolean;
    error?: string;
}
