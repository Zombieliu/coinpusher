/*
 * @Author: dgflash
 * @Date: 2022-05-05 09:37:49
 * @LastEditors: dgflash
 * @LastEditTime: 2022-11-14 16:43:51
 */

import { ShareConfig } from "../../tsrpc/models/ShareConfig";
import os from 'os';

const defaultIp = process.env.SERVER_PUBLIC_HOST || os.hostname() || "127.0.0.1";

/** 服务器配置 */
export const Config = {
    /** 证书 */
    certificate: 'dgflash.work',
    /** 数据库地址 */
    mongodb: process.env.MONGO_URI || "mongodb:27017",
    /** 网关服务器配置 */
    gate: {
        port: process.env['GATE_PORT'] || process.env['PORT'] || "2000",
        area: [
            { name: "艾欧尼亚", server: `${defaultIp}:2100` },
            { name: "诺克萨斯", server: `${defaultIp}:2200` }
        ]
    },
    match: {
        port: process.env['MATCH_PORT'] || process.env['PORT'] || "2100",
        interval_logger: 5000,
        match_interval_start: 5000,
    },
    room: {
        logMsg: false,
        port: process.env['ROOM_PORT'] || process.env['PORT'] || "2201",
        match_url_http: process.env['SERVER_URL_MATCH'] || process.env['MATCH_INTERNAL_URL'] || `${defaultIp}:2100`,
        match_url_ws: process.env['SERVER_URL_ROOM'] || process.env['ROOM_PUBLIC_HOST'] || `${defaultIp}`,
        update_state_interval: 1000,
        max_user_num: 10,
        empty_time: 3000,
        broadcast_player_state_rate: Math.floor(1000 / 2),
    },
    ips: {
        "localhost": true,
        "127.0.0.1": true,
        "192.168.31.17": true,
        "43.142.65.105": true,
        "dgflash.work": true
    }
}

export function dev() {
    if (ShareConfig.https && (defaultIp.indexOf("127.0.0.1") != -1 || defaultIp.indexOf("localhost") != -1)) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
