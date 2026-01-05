import { PaymentOrder, OrderStatus } from "../../../types/payment";

export interface ReqGetOrders {
    __ssoToken?: string;
    userId?: string;
    status?: OrderStatus;
    orderId?: string;
    startDate?: number;
    endDate?: number;
    page?: number;
    limit?: number;
}

export interface ResGetOrders {
    success: boolean;
    orders?: PaymentOrder[];
    total?: number;
    error?: string;
}
