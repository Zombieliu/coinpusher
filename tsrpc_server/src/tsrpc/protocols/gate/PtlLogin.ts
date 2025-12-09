import { BaseRequest, BaseResponse, BaseConf } from "../base";

/** 登录请求信息 */
export interface ReqLogin extends BaseRequest {
    /** 用户名 */
    username: string
}

/** 登录响应信息 */
export interface ResLogin extends BaseResponse {
    /** 玩家唯一标识 */
    userId: string;
    /** 登录 Token */
    token: string;
    /** 当前金币 */
    gold: number;
    /** 离线奖励 */
    offlineReward: number;
    /** 匹配服务器地址 */
    matchUrl: string;
}

export const conf: BaseConf = {}