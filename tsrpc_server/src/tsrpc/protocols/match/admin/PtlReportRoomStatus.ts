import { BaseRequest, BaseResponse } from "../../base";

export interface ReqReportRoomStatus extends BaseRequest {
    serverId: string;
    roomCount: number;
    userCount: number;
    cpuUsage: number; // 0-100
}

export interface ResReportRoomStatus extends BaseResponse {
}
