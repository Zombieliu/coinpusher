import { DeviceFingerprintCollector } from "./DeviceFingerprintCollector";

/**
 * 安全相关工具：nonce 生成、指纹 ID 缓存、时间戳
 */
export class SecurityUtil {
    private static _fpPromise: Promise<string> | null = null;

    /** 生成随机 nonce（默认 16 hex 字符，128bit 可调） */
    static generateNonce(byteLength: number = 8): string {
        const arr = new Uint8Array(byteLength);
        crypto.getRandomValues(arr);
        return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /** 当前时间戳（毫秒） */
    static now(): number {
        return Date.now();
    }

    /** 获取（或生成并缓存）指纹 ID */
    static async getFingerprintId(): Promise<string> {
        if (!this._fpPromise) {
            this._fpPromise = DeviceFingerprintCollector.getFingerprintId()
                .then(({ fingerprintId }) => fingerprintId)
                .catch(err => {
                    console.warn('[SecurityUtil] fingerprint collection failed, fallback to unknown:', err);
                    this._fpPromise = null;
                    return 'fp_unknown';
                });
        }
        return this._fpPromise;
    }
}
