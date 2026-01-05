/*
 * @Author: dgflash
 * @Date: 2022-06-29 16:39:42
 * @LastEditors: dgflash
 * @LastEditTime: 2023-05-18 09:25:51
 */

    /** 前后端共享配置 */
export class ShareConfig {
    /** 默认网关 */
    // static gate: string = "dgflash.work:8000";
    // 本地 docker-compose 暴露 gate-server 为 32000 -> 容器 3000
    static gate: string = "127.0.0.1:32000";

    // 前端运行时（浏览器）没有 Node 的 `process`，这里做统一兜底
    private static env: Record<string, string | undefined> = (typeof globalThis !== 'undefined'
        && (globalThis as any).process
        && (globalThis as any).process.env) || {};

    /** 🔒 强制HTTPS - 生产环境必须启用 */
    static https: boolean = ShareConfig.env.NODE_ENV === 'production'
        ? true
        : (ShareConfig.env.FORCE_HTTPS === 'true');

    /** 🔒 传输协议是否使用加密功能 - 生产环境必须启用 */
    static security: boolean = ShareConfig.env.NODE_ENV === 'production'
        ? true
        : (ShareConfig.env.ENABLE_SECURITY === 'true');

    /** 是否用JSON协议，否则用二进制 */
    static json: boolean = ShareConfig.env.USE_JSON !== 'false';  // 默认使用JSON便于调试

    /** 两个心跳数据包之间的间隔时间（单位：毫秒） */
    static heartbeat_interval: number = 5000;
    /** 如果在此期间心跳数据包没有得到回复，连接将被关闭（单位：毫秒） */
    static heartbeat_timeout: number = 5000;
}
