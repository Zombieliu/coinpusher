/*
 * @Author: dgflash
 * @Date: 2022-05-12 14:18:40
 * @LastEditors: dgflash
 * @LastEditTime: 2022-09-20 10:29:07
 */

import fs from 'fs';
import path from "path";
import { ecs } from "../../core/ecs/ECS";
import { ShareConfig } from '../../tsrpc/models/ShareConfig';
import { Config } from "../config/Config";

const internalTlsEnabled = (() => {
    const flag = process.env.ENABLE_INTERNAL_TLS;
    if (!flag) {
        // 如果未显式配置，则当存在证书信息时仍默认开启
        return !!(process.env.TLS_KEY_PATH || process.env.TLS_CERT_PATH || process.env.TLS_KEY || process.env.TLS_CERT);
    }
    const lowered = flag.toLowerCase();
    return !(lowered === 'false' || lowered === '0' || lowered === 'no');
})();

/** 服务器工具 */
export class CommonUtil {
    /** ECS 实始化 */
    static init<T>(sys: ecs.RootSystem) {
        sys.init();

        var ms = 1 / 60;
        setInterval(() => {
            sys.execute(ms);
        }, ms);
    }

    static isInternalTlsEnabled(): boolean {
        return internalTlsEnabled;
    }

    /** 获取证书 */
    static getCertificate(): any {
        if (ShareConfig.https && internalTlsEnabled) {
            const keyPath = process.env.TLS_KEY_PATH
                ? process.env.TLS_KEY_PATH
                : path.resolve(__dirname, `../../${Config.certificate}.key`);
            const certPath = process.env.TLS_CERT_PATH
                ? process.env.TLS_CERT_PATH
                : path.resolve(__dirname, `../../${Config.certificate}.crt`);

            if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
                console.warn(`[CommonUtil] Certificate files not found (${keyPath}, ${certPath}), falling back to HTTP.`);
                return undefined;
            }

            return {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            }
        }
        return undefined;
    }
}
