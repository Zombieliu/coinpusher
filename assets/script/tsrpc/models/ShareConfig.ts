/*
 * @Author: dgflash
 * @Date: 2022-06-29 16:39:42
 * @LastEditors: dgflash
 * @LastEditTime: 2023-05-18 09:25:51
 */

/** 前后端共享配置 */
const env = (typeof process !== 'undefined' && process.env) ? process.env : {} as Record<string, string | undefined>;

export class ShareConfig {
    /** 默认网关 */
    // static gate: string = "dgflash.work:8000";
    static gate: string = "127.0.0.1:2000";

    /** 🔒 强制HTTPS - 生产环境必须启用 */
    static https: boolean = env.NODE_ENV === 'production'
        ? true
        : (env.FORCE_HTTPS === 'true');

    /** 🔒 传输协议是否使用加密功能 - 生产环境必须启用 */
    static security: boolean = env.NODE_ENV === 'production'
        ? true
        : (env.ENABLE_SECURITY === 'true');

    /** 是否用JSON协议，否则用二进制 */
    static json: boolean = env.USE_JSON !== 'false';  // 默认使用JSON便于调试

    /** 两个心跳数据包之间的间隔时间（单位：毫秒） */
    static heartbeat_interval: number = 5000;
    /** 如果在此期间心跳数据包没有得到回复，连接将被关闭（单位：毫秒） */
    static heartbeat_timeout: number = 5000;
}
