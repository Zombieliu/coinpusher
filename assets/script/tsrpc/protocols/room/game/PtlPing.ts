import { BaseRequest, BaseResponse } from "../../base";

/** Ping请求 - 用于RTT测量和时间同步 */
export interface ReqPing extends BaseRequest {
    /** 客户端发送时的本地时间戳 (ms) */
    clientTime: number;
}

/** Pong响应 - 返回服务器时间信息 */
export interface ResPing extends BaseResponse {
    /** 客户端发送时的本地时间戳 (回传) */
    clientTime: number;

    /** 服务器当前 tick */
    serverTick: number;

    /** 服务器处理此请求时的时间戳 (ms) */
    serverTime: number;
}
