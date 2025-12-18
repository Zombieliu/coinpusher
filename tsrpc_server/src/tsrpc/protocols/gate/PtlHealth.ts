import { BaseRequest, BaseResponse, BaseConf } from "../base";

export interface ReqHealth extends BaseRequest {
}

export interface ResHealth extends BaseResponse {
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
}

export const conf: BaseConf = {};
