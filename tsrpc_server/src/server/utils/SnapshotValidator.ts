import * as crypto from 'crypto';

/**
 * 🔒 物理引擎快照签名验证
 *
 * 功能：
 * - 验证 Rust 物理引擎快照完整性
 * - 防止快照伪造攻击
 * - 检测数据篡改
 */

export interface SignedSnapshot {
    tick: number;               // 服务器tick
    roomId: string;             // 房间ID
    pushZ: number;              // 推板位置
    coins: any[];               // 硬币状态
    events: any[];              // 游戏事件
    timestamp: number;          // 快照时间戳（毫秒）
    signature?: string;         // HMAC-SHA256签名（hex）
}

export class SnapshotValidator {
    /**
     * 🔒 对快照签名（由 Rust 物理引擎调用）
     * @param snapshot 物理快照数据（不含signature字段）
     * @returns 签名字符串（hex格式）
     */
    static signSnapshot(snapshot: Omit<SignedSnapshot, 'signature'>): string {
        const secretKey = process.env.INTERNAL_SECRET_KEY;
        if (!secretKey || secretKey.length < 32) {
            throw new Error('INTERNAL_SECRET_KEY not configured properly');
        }

        // 规范化数据用于签名（确保字段顺序一致）
        const dataToSign = JSON.stringify({
            tick: snapshot.tick,
            roomId: snapshot.roomId,
            pushZ: snapshot.pushZ,
            coins: snapshot.coins,
            events: snapshot.events,
            timestamp: snapshot.timestamp
        });

        return crypto
            .createHmac('sha256', secretKey)
            .update(dataToSign)
            .digest('hex');
    }

    /**
     * 🔒 验证快照签名
     * @param snapshot 包含签名的快照数据
     * @returns 验证结果
     */
    static verifySnapshot(snapshot: SignedSnapshot): {
        valid: boolean;
        error?: string;
    } {
        // 1. 检查是否有签名
        if (!snapshot.signature) {
            return {
                valid: false,
                error: 'Snapshot missing signature'
            };
        }

        // 2. 检查时间戳（防重放攻击）
        const now = Date.now();
        const age = now - snapshot.timestamp;
        const MAX_SNAPSHOT_AGE_MS = 5000; // 5秒容差

        if (age > MAX_SNAPSHOT_AGE_MS) {
            console.warn(`[SnapshotValidator] Snapshot too old: ${age}ms`);
            return {
                valid: false,
                error: `Snapshot timestamp expired (age: ${age}ms)`
            };
        }

        if (age < -1000) {
            // 时间戳在未来（时钟偏差）
            console.warn(`[SnapshotValidator] Snapshot timestamp in future: ${age}ms`);
            return {
                valid: false,
                error: 'Snapshot timestamp in future (clock skew detected)'
            };
        }

        // 3. 计算期望的签名
        try {
            const expectedSignature = this.signSnapshot({
                tick: snapshot.tick,
                roomId: snapshot.roomId,
                pushZ: snapshot.pushZ,
                coins: snapshot.coins,
                events: snapshot.events,
                timestamp: snapshot.timestamp
            });

            // 4. 对比签名（使用constant-time比较防止时序攻击）
            const providedSignature = snapshot.signature;
            if (!this.constantTimeEqual(expectedSignature, providedSignature)) {
                console.warn('[SnapshotValidator] Signature mismatch', {
                    expected: expectedSignature.substring(0, 16) + '...',
                    provided: providedSignature.substring(0, 16) + '...'
                });
                return {
                    valid: false,
                    error: 'Invalid snapshot signature'
                };
            }

            return { valid: true };
        } catch (error: any) {
            console.error('[SnapshotValidator] Verification error:', error);
            return {
                valid: false,
                error: `Verification failed: ${error.message}`
            };
        }
    }

    /**
     * 🔒 Constant-time字符串比较（防止时序攻击）
     */
    private static constantTimeEqual(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }

    /**
     * 获取快照摘要（用于日志/监控）
     */
    static getSnapshotDigest(snapshot: SignedSnapshot): string {
        const data = JSON.stringify({
            tick: snapshot.tick,
            roomId: snapshot.roomId,
            coinsCount: snapshot.coins.length,
            eventsCount: snapshot.events.length
        });

        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    /**
     * 🔒 启用快照验证的环境检查
     */
    static isSignatureEnabled(): boolean {
        // 生产环境强制启用
        if (process.env.NODE_ENV === 'production') {
            return true;
        }

        // 开发环境可通过环境变量控制
        return process.env.ENABLE_SNAPSHOT_SIGNATURE === 'true';
    }
}
