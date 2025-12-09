import { RefundRequest } from "../../../../server/gate/bll/PaymentSystem";

export interface ReqGetRefunds {
    __ssoToken?: string;
    status?: string; // pending, approved, rejected, completed
    page?: number;
    limit?: number;
}

export interface ResGetRefunds {
    success: boolean;
    refunds?: RefundRequest[];
    total?: number;
    error?: string;
}
