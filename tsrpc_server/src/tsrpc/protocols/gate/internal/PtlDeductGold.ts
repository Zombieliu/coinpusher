import { BaseRequest, BaseResponse } from "../../base";

export interface ReqDeductGold extends BaseRequest {
    /** 事务ID - 用于幂等性保证，防止重复扣费 */
    transactionId: string;

    userId: string;
    amount: number;
    reason: string;

    /** 🔒 内部服务Token（向后兼容） */
    __ssoToken?: string;

    /** 🔒 请求签名（HMAC-SHA256） */
    signature?: string;

    /** 🔒 请求时间戳（毫秒）- 用于防重放攻击 */
    timestamp?: number;
}

export interface ResDeductGold extends BaseResponse {
    balance: number;

    /** 是否为重复请求（事务已处理） */
    isDuplicate?: boolean;
}
