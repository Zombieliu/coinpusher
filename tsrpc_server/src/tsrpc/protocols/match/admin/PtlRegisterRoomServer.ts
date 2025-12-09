import { BaseRequest, BaseResponse } from "../../base";

export interface ReqRegisterRoomServer extends BaseRequest {
    /** 内网/公网 IP，客户端可访问的地址 */
    url: string;
    /** 唯一 ID，通常是 IP:Port */
    serverId: string;
}

export interface ResRegisterRoomServer extends BaseResponse {
}
