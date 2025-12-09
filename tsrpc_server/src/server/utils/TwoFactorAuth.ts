import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

/**
 * 🔒 双因素认证 (2FA) 系统
 *
 * 功能：
 * - TOTP (Time-based One-Time Password) 实现
 * - 基于 RFC 6238 标准
 * - 兼容 Google Authenticator / Authy
 */

export interface TwoFactorSetup {
    secret: string;             // Base32编码的密钥
    qrCode: string;             // QR码图片 (Data URL)
    backupCodes: string[];      // 备用恢复码
}

export interface TwoFactorData {
    secret: string;             // Base32编码的密钥
    enabled: boolean;           // 是否已启用
    backupCodes?: string[];     // 备用恢复码（已使用的会被移除）
    lastUsedAt?: number;        // 最后使用时间
}

export class TwoFactorAuth {
    /**
     * 🔒 生成2FA设置（用于用户首次启用）
     * @param username 用户名
     * @param issuer 发行者名称（如 "CoinPusher Game"）
     */
    static async generateSetup(username: string, issuer: string = 'CoinPusher Admin'): Promise<TwoFactorSetup> {
        // 生成随机密钥
        const secret = speakeasy.generateSecret({
            name: `${issuer} (${username})`,
            issuer: issuer,
            length: 32
        });

        // 生成QR码
        const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

        // 生成8个备用恢复码
        const backupCodes = this.generateBackupCodes(8);

        return {
            secret: secret.base32,
            qrCode,
            backupCodes
        };
    }

    /**
     * 🔒 验证TOTP令牌
     * @param secret Base32编码的密钥
     * @param token 用户输入的6位数字码
     * @param window 时间窗口（默认1，允许前后1个30秒窗口的误差）
     */
    static verifyToken(secret: string, token: string, window: number = 1): boolean {
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window
        });
    }

    /**
     * 🔒 验证备用恢复码
     * @param backupCodes 用户的备用码列表
     * @param code 用户输入的恢复码
     * @returns {valid: boolean, remainingCodes: string[]} 验证结果和剩余的恢复码
     */
    static verifyBackupCode(
        backupCodes: string[],
        code: string
    ): { valid: boolean; remainingCodes: string[] } {
        const normalizedCode = code.replace(/[^A-Z0-9]/g, '').toUpperCase();
        const index = backupCodes.indexOf(normalizedCode);

        if (index === -1) {
            return { valid: false, remainingCodes: backupCodes };
        }

        // 移除已使用的恢复码
        const remainingCodes = backupCodes.filter((_, i) => i !== index);
        return { valid: true, remainingCodes };
    }

    /**
     * 生成备用恢复码
     * @param count 生成数量
     * @returns 恢复码数组（格式：XXXX-XXXX-XXXX）
     */
    private static generateBackupCodes(count: number): string[] {
        const codes: string[] = [];

        for (let i = 0; i < count; i++) {
            // 生成12位随机字母数字码
            const randomBytes = crypto.randomBytes(8);
            const code = randomBytes.toString('hex').toUpperCase().substring(0, 12);

            // 格式化为 XXXX-XXXX-XXXX
            const formatted = `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}`;
            codes.push(formatted);
        }

        return codes;
    }

    /**
     * 🔒 生成新的备用恢复码（用户丢失恢复码时）
     * 需要验证用户身份后才能调用
     */
    static regenerateBackupCodes(count: number = 8): string[] {
        return this.generateBackupCodes(count);
    }

    /**
     * 获取当前TOTP令牌（用于测试）
     * ⚠️ 仅用于开发/测试环境
     */
    static getCurrentToken(secret: string): string {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('getCurrentToken should not be used in production');
        }

        return speakeasy.totp({
            secret,
            encoding: 'base32'
        });
    }
}
