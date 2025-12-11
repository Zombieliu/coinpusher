import { OrderStatus } from "../../../../server/gate/bll/PaymentSystem";

export interface ReqUpdateOrderStatus {
    __ssoToken?: string;
    orderId: string;
    status: OrderStatus;
}

export interface ResUpdateOrderStatus {
    success: boolean;
}
