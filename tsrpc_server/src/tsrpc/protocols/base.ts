/*
 * @Author: dgflash
 * @Date: 2022-05-12 14:18:40
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-02 00:11:50
 */

/** HTTP 基础请求数据 */
export interface BaseRequest {
    /** 通行证 */
    __ssoToken?: string;
    /** 设备指纹 ID（客户端生成并缓存） */
    fingerprintId?: string;
    /** 防重放 nonce（客户端随机生成，服务端可选去重） */
    nonce?: string;
    /** 客户端时间戳（ms，服务端可校验时间窗） */
    timestamp?: number;
}

/** HTTP 基础返回数据 */
export interface BaseResponse {
    /** 通行证 */
    __ssoToken?: string;
}

/** 基础配置数据 */
export interface BaseConf {
    /** 是否必须登录 */
    needLogin?: boolean
    /** 是否验证客户端请求地址在白名单中 */
    needCheckAddress?: boolean
}

/** 长链接基础消息数据 */
export interface BaseMessage {
    /** 是否必须登录 */
    needLogin?: boolean
}
