export interface ReqDeliverOrder {
    __ssoToken?: string;
    orderId: string;
}

export interface ResDeliverOrder {
    success: boolean;
}
