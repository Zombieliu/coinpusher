import { BaseRequest, BaseResponse, BaseConf } from "../base";

export interface ReqHealth extends BaseRequest {
}

export interface HealthCheckDetail {
    status: 'up' | 'down' | 'degraded';
    message?: string;
    responseTime?: number;
}

export interface ResHealth extends BaseResponse {
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    timestamp?: number;
    uptime?: number;
    checks?: Record<string, HealthCheckDetail>;
}

export const conf: BaseConf = {};
