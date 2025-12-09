import { PaymentOrder, OrderStatus } from "../../../../server/gate/bll/PaymentSystem";

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
