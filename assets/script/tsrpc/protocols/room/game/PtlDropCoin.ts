import { BaseRequest, BaseResponse } from "../../base";

export interface ReqDropCoin extends BaseRequest {
    x: number; // 投币的 X 坐标
}

export interface ResDropCoin extends BaseResponse {
    coinId: number;
}
