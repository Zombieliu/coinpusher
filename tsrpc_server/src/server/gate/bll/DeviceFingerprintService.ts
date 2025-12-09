/**
 * 🔍 设备指纹服务（服务器端）
 *
 * 功能：
 * 1. 存储和验证设备指纹
 * 2. 多维度关联分析（设备+IP+钱包）
 * 3. 检测可疑账号
 * 4. 风险评分
 */

import { createHash } from 'crypto';
import { Collection, Db } from 'mongodb';

export interface DeviceFingerprintData {
    userAgent: string;
    platform: string;
    language: string;
    timezone: number;
    timezoneString: string;
    screenResolution: string;
    screenColorDepth: number;
    hardwareConcurrency: number;
    canvasFingerprint: string;
    webGLFingerprint: string;
    audioFingerprint: string;
    fontFingerprint: string;
}

export interface DeviceFingerprintRecord {
    fingerprintHash: string;      // 设备指纹SHA256
    userId: string;               // 用户ID
    ipAddress: string;            // IP地址
    ipCountry?: string;           // IP国家
    walletAddress?: string;       // 钱包地址（Web3）

    // 完整指纹数据
    fullFingerprint: DeviceFingerprintData;

    // 元数据
    firstSeen: number;            // 首次出现时间
    lastSeen: number;             // 最后出现时间
    useCount: number;             // 使用次数
}

export interface SuspiciousAccountResult {
    isSuspicious: boolean;
    riskScore: number;           // 0-100
    reasons: string[];
    relatedUsers: {
        userId: string;
        relation: 'same_device' | 'same_ip' | 'same_wallet';
        confidence: number;      // 0-1
    }[];
}

export class DeviceFingerprintService {
    private static db: Db;
    private static collection: Collection<DeviceFingerprintRecord>;

    static async init(db: Db) {
        this.db = db;
        this.collection = db.collection<DeviceFingerprintRecord>('device_fingerprints');

        // 创建索引
        await this.collection.createIndex({ fingerprintHash: 1 });
        await this.collection.createIndex({ userId: 1 });
        await this.collection.createIndex({ ipAddress: 1 });
        await this.collection.createIndex({ walletAddress: 1 }, { sparse: true });
        await this.collection.createIndex({ lastSeen: 1 });
        await this.collection.createIndex(
            { userId: 1, fingerprintHash: 1 },
            { unique: true }
        );
    }

    /**
     * 生成设备指纹哈希
     */
    static generateHash(fingerprint: DeviceFingerprintData): string {
        const components = [
            fingerprint.canvasFingerprint,
            fingerprint.webGLFingerprint,
            fingerprint.audioFingerprint,
            fingerprint.fontFingerprint,
            fingerprint.screenResolution,
            fingerprint.platform,
            fingerprint.hardwareConcurrency.toString(),
        ];

        const combined = components.filter(Boolean).join('|');
        return createHash('sha256').update(combined).digest('hex');
    }

    /**
     * 记录设备指纹
     */
    static async recordFingerprint(
        userId: string,
        fingerprint: DeviceFingerprintData,
        ipAddress: string,
        walletAddress?: string
    ): Promise<string> {
        const fingerprintHash = this.generateHash(fingerprint);
        const now = Date.now();

        // Upsert记录
        await this.collection.updateOne(
            { userId, fingerprintHash },
            {
                $set: {
                    ipAddress,
                    walletAddress,
                    fullFingerprint: fingerprint,
                    lastSeen: now
                },
                $setOnInsert: {
                    firstSeen: now,
                },
                $inc: { useCount: 1 }
            },
            { upsert: true }
        );

        return fingerprintHash;
    }

    /**
     * 检测可疑账号
     */
    static async detectSuspiciousAccount(
        userId: string,
        fingerprintHash: string,
        ipAddress: string,
        walletAddress?: string
    ): Promise<SuspiciousAccountResult> {
        const relatedUsers: SuspiciousAccountResult['relatedUsers'] = [];
        const reasons: string[] = [];
        let riskScore = 0;

        // 1. 查找相同设备指纹的其他账号
        const sameDeviceUsers = await this.collection.find({
            fingerprintHash,
            userId: { $ne: userId }
        }).toArray();

        if (sameDeviceUsers.length > 0) {
            reasons.push(`Same device: ${sameDeviceUsers.length} other accounts`);
            riskScore += Math.min(50, sameDeviceUsers.length * 15);

            for (const user of sameDeviceUsers) {
                relatedUsers.push({
                    userId: user.userId,
                    relation: 'same_device',
                    confidence: 0.9
                });
            }
        }

        // 2. 查找相同IP的账号（24小时内）
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const sameIPUsers = await this.collection.find({
            ipAddress,
            lastSeen: { $gte: dayAgo },
            userId: { $ne: userId }
        }).toArray();

        if (sameIPUsers.length > 0) {
            reasons.push(`Same IP (24h): ${sameIPUsers.length} accounts`);
            riskScore += Math.min(30, sameIPUsers.length * 5);

            for (const user of sameIPUsers) {
                const existing = relatedUsers.find(r => r.userId === user.userId);
                if (!existing) {
                    relatedUsers.push({
                        userId: user.userId,
                        relation: 'same_ip',
                        confidence: 0.5
                    });
                } else {
                    // 既有相同设备又有相同IP，提高置信度
                    existing.confidence = 0.95;
                }
            }
        }

        // 3. 查找相同钱包地址的账号（Web3场景）
        if (walletAddress) {
            const sameWalletUsers = await this.collection.find({
                walletAddress,
                userId: { $ne: userId }
            }).toArray();

            if (sameWalletUsers.length > 0) {
                reasons.push(`Same wallet: ${sameWalletUsers.length} accounts`);
                riskScore += Math.min(40, sameWalletUsers.length * 20);

                for (const user of sameWalletUsers) {
                    const existing = relatedUsers.find(r => r.userId === user.userId);
                    if (!existing) {
                        relatedUsers.push({
                            userId: user.userId,
                            relation: 'same_wallet',
                            confidence: 0.85
                        });
                    } else {
                        existing.confidence = 0.99;
                    }
                }
            }
        }

        // 4. 检测设备指纹变化过于频繁（账号盗用）
        const userFingerprints = await this.collection.find({ userId }).toArray();
        if (userFingerprints.length > 5) {
            reasons.push(`Too many devices: ${userFingerprints.length}`);
            riskScore += Math.min(20, (userFingerprints.length - 5) * 5);
        }

        // 风险判定
        const isSuspicious = riskScore >= 50;

        return {
            isSuspicious,
            riskScore: Math.min(100, riskScore),
            reasons,
            relatedUsers
        };
    }

    /**
     * 获取用户所有设备
     */
    static async getUserDevices(userId: string): Promise<DeviceFingerprintRecord[]> {
        return await this.collection.find({ userId }).toArray();
    }

    /**
     * 获取设备的所有用户
     */
    static async getDeviceUsers(fingerprintHash: string): Promise<DeviceFingerprintRecord[]> {
        return await this.collection.find({ fingerprintHash }).toArray();
    }

    /**
     * 分析指纹相似度（用于更精细的检测）
     */
    static calculateSimilarity(fp1: DeviceFingerprintData, fp2: DeviceFingerprintData): number {
        let score = 0;
        let total = 0;

        // Canvas指纹匹配
        total += 30;
        if (fp1.canvasFingerprint === fp2.canvasFingerprint) score += 30;

        // WebGL指纹匹配
        total += 25;
        if (fp1.webGLFingerprint === fp2.webGLFingerprint) score += 25;

        // Audio指纹匹配
        total += 20;
        if (fp1.audioFingerprint === fp2.audioFingerprint) score += 20;

        // 屏幕分辨率匹配
        total += 10;
        if (fp1.screenResolution === fp2.screenResolution) score += 10;

        // 平台匹配
        total += 10;
        if (fp1.platform === fp2.platform) score += 10;

        // 硬件并发数匹配
        total += 5;
        if (fp1.hardwareConcurrency === fp2.hardwareConcurrency) score += 5;

        return score / total;
    }

    /**
     * 清理过期指纹（超过90天未使用）
     */
    static async cleanupOldFingerprints(): Promise<number> {
        const threshold = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const result = await this.collection.deleteMany({
            lastSeen: { $lt: threshold }
        });
        return result.deletedCount;
    }

    /**
     * 获取可疑设备排行（被多个账号使用）
     */
    static async getSuspiciousDevices(limit: number = 10): Promise<Array<{
        fingerprintHash: string;
        userCount: number;
        users: string[];
    }>> {
        const pipeline = [
            {
                $group: {
                    _id: '$fingerprintHash',
                    userCount: { $sum: 1 },
                    users: { $push: '$userId' }
                }
            },
            {
                $match: {
                    userCount: { $gt: 1 }
                }
            },
            {
                $sort: { userCount: -1 }
            },
            {
                $limit: limit
            }
        ];

        const results = await this.collection.aggregate(pipeline).toArray();

        return results.map(r => ({
            fingerprintHash: r._id,
            userCount: r.userCount,
            users: r.users
        }));
    }
}
