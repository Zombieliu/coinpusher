import { OrderStatus } from "../../../types/payment";

export interface ReqUpdateOrderStatus {
    __ssoToken?: string;
    orderId: string;
    status: OrderStatus;
}

export interface ResUpdateOrderStatus {
    success: boolean;
}
