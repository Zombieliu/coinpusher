import * as crypto from 'crypto';
import { MongoDBService } from '../gate/db/MongoDBService';

/**
 * 🔒 Tamper-Proof Audit Logging System
 *
 * 防篡改审计日志系统:
 * 1. 链式哈希 (Blockchain-like) - 每条日志包含前一条的哈希
 * 2. HMAC 签名 - 使用密钥对日志签名
 * 3. 不可删除 - 只能追加，不能修改或删除
 * 4. 完整性验证 - 检测日志是否被篡改
 *
 * 用途:
 * - 记录所有管理员敏感操作
 * - 审计合规 (SOC 2, PCI DSS)
 * - 安全事件溯源
 */

export enum AuditAction {
    // 认证相关
    LOGIN = 'LOGIN',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    PASSWORD_CHANGED = 'PASSWORD_CHANGED',
    TWO_FACTOR_ENABLED = '2FA_ENABLED',
    TWO_FACTOR_DISABLED = '2FA_DISABLED',
    TWO_FACTOR_VERIFIED = '2FA_VERIFIED',

    // 用户管理
    USER_BANNED = 'USER_BANNED',
    USER_UNBANNED = 'USER_UNBANNED',
    REWARD_GRANTED = 'REWARD_GRANTED',

    // 配置修改
    CONFIG_UPDATED = 'CONFIG_UPDATED',
    EVENT_CREATED = 'EVENT_CREATED',
    EVENT_UPDATED = 'EVENT_UPDATED',
    EVENT_DELETED = 'EVENT_DELETED',

    // 邮件发送
    MAIL_SENT = 'MAIL_SENT',
    BROADCAST_MAIL_SENT = 'BROADCAST_MAIL_SENT',

    // 管理员管理
    ADMIN_CREATED = 'ADMIN_CREATED',
    ADMIN_DISABLED = 'ADMIN_DISABLED',
    ADMIN_ROLE_CHANGED = 'ADMIN_ROLE_CHANGED',

    // 安全事件
    ACCESS_DENIED = 'ACCESS_DENIED',
    IP_BLOCKED = 'IP_BLOCKED',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

export interface AuditLogEntry {
    id: string;                    // 唯一 ID
    sequenceNumber: number;         // 序列号
    timestamp: number;              // 时间戳
    adminId: string;                // 操作者 ID
    username: string;               // 操作者用户名
    action: AuditAction;            // 操作类型
    resource?: string;              // 操作资源 (例如: userId, configKey)
    details: any;                   // 详细信息
    ip?: string;                    // 客户端 IP
    userAgent?: string;             // User-Agent
    success: boolean;               // 是否成功
    // 🔒 完整性保护字段
    previousHash: string;           // 前一条日志的哈希
    currentHash: string;            // 当前日志的哈希 (基于所有字段 + previousHash)
    signature: string;              // HMAC 签名
}

export class AuditLogger {
    private static readonly SECRET_KEY = process.env.AUDIT_LOG_SECRET_KEY || process.env.INTERNAL_SECRET_KEY || '';
    private static lastLogHash: string = '0';
    private static sequenceNumber: number = 0;

    /**
     * 🔒 初始化审计日志系统
     */
    static async initialize(): Promise<void> {
        if (!this.SECRET_KEY) {
            throw new Error('AUDIT_LOG_SECRET_KEY or INTERNAL_SECRET_KEY must be set');
        }

        // 从数据库加载最后一条日志
        const collection = MongoDBService.getCollection('audit_logs');
        const lastLog = await collection.findOne(
            {},
            { sort: { sequenceNumber: -1 } }
        ) as unknown as AuditLogEntry | null;

        if (lastLog) {
            this.lastLogHash = lastLog.currentHash;
            this.sequenceNumber = lastLog.sequenceNumber;
            console.log(`🔒 [AuditLogger] Initialized from sequence ${this.sequenceNumber}`);
        } else {
            console.log(`🔒 [AuditLogger] Initialized with empty log chain`);
        }

        // 创建索引
        await collection.createIndex({ sequenceNumber: 1 }, { unique: true });
        await collection.createIndex({ adminId: 1, timestamp: -1 });
        await collection.createIndex({ action: 1, timestamp: -1 });
    }

    /**
     * 🔒 记录审计日志
     */
    static async log(
        adminId: string,
        username: string,
        action: AuditAction,
        details: any,
        options?: {
            resource?: string;
            ip?: string;
            userAgent?: string;
            success?: boolean;
        }
    ): Promise<void> {
        try {
            const collection = MongoDBService.getCollection('audit_logs');

            // 增加序列号
            this.sequenceNumber++;

            // 创建日志条目
            const entry: Omit<AuditLogEntry, 'currentHash' | 'signature'> = {
                id: `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
                sequenceNumber: this.sequenceNumber,
                timestamp: Date.now(),
                adminId,
                username,
                action,
                resource: options?.resource,
                details,
                ip: options?.ip,
                userAgent: options?.userAgent,
                success: options?.success !== false,
                previousHash: this.lastLogHash
            };

            // 🔒 计算哈希
            const currentHash = this.computeHash(entry);

            // 🔒 计算签名
            const signature = this.computeSignature(entry, currentHash);

            // 完整日志条目
            const fullEntry: AuditLogEntry = {
                ...entry,
                currentHash,
                signature
            };

            // 保存到数据库
            await collection.insertOne(fullEntry);

            // 更新最后哈希
            this.lastLogHash = currentHash;

            console.log(`🔒 [AuditLogger] #${this.sequenceNumber} ${action} by ${username}`);
        } catch (error) {
            console.error('[AuditLogger] Failed to write log:', error);
            // 审计日志失败不应影响主业务，但要记录错误
        }
    }

    /**
     * 🔒 计算日志条目的哈希
     */
    private static computeHash(entry: Omit<AuditLogEntry, 'currentHash' | 'signature'>): string {
        const dataToHash = JSON.stringify({
            id: entry.id,
            sequenceNumber: entry.sequenceNumber,
            timestamp: entry.timestamp,
            adminId: entry.adminId,
            username: entry.username,
            action: entry.action,
            resource: entry.resource,
            details: entry.details,
            ip: entry.ip,
            userAgent: entry.userAgent,
            success: entry.success,
            previousHash: entry.previousHash
        });

        return crypto
            .createHash('sha256')
            .update(dataToHash)
            .digest('hex');
    }

    /**
     * 🔒 计算 HMAC 签名
     */
    private static computeSignature(
        entry: Omit<AuditLogEntry, 'currentHash' | 'signature'>,
        currentHash: string
    ): string {
        const dataToSign = `${entry.sequenceNumber}:${entry.timestamp}:${entry.action}:${currentHash}`;

        return crypto
            .createHmac('sha256', this.SECRET_KEY)
            .update(dataToSign)
            .digest('hex');
    }

    /**
     * 🔒 验证单条日志的完整性
     */
    static verifyEntry(entry: AuditLogEntry): {
        valid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // 1. 验证哈希
        const expectedHash = this.computeHash(entry);
        if (expectedHash !== entry.currentHash) {
            errors.push('Hash mismatch - log data has been tampered');
        }

        // 2. 验证签名
        const expectedSignature = this.computeSignature(entry, entry.currentHash);
        if (expectedSignature !== entry.signature) {
            errors.push('Signature mismatch - log signature invalid');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 🔒 验证日志链的完整性
     */
    static async verifyLogChain(
        startSequence?: number,
        endSequence?: number
    ): Promise<{
        valid: boolean;
        totalChecked: number;
        errors: Array<{ sequence: number; error: string }>;
    }> {
        const collection = MongoDBService.getCollection('audit_logs');

        const query: any = {};
        if (startSequence !== undefined || endSequence !== undefined) {
            query.sequenceNumber = {};
            if (startSequence !== undefined) query.sequenceNumber.$gte = startSequence;
            if (endSequence !== undefined) query.sequenceNumber.$lte = endSequence;
        }

        const logs = await collection
            .find(query)
            .sort({ sequenceNumber: 1 })
            .toArray() as unknown as AuditLogEntry[];

        const errors: Array<{ sequence: number; error: string }> = [];
        let previousHash = startSequence === undefined || startSequence === 1 ? '0' : null;

        for (const log of logs) {
            // 验证日志本身
            const entryVerification = this.verifyEntry(log);
            if (!entryVerification.valid) {
                errors.push({
                    sequence: log.sequenceNumber,
                    error: entryVerification.errors.join(', ')
                });
            }

            // 验证链式哈希
            if (previousHash !== null && log.previousHash !== previousHash) {
                errors.push({
                    sequence: log.sequenceNumber,
                    error: `Chain broken: expected previousHash ${previousHash}, got ${log.previousHash}`
                });
            }

            previousHash = log.currentHash;
        }

        return {
            valid: errors.length === 0,
            totalChecked: logs.length,
            errors
        };
    }

    /**
     * 🔒 查询审计日志
     */
    static async queryLogs(filter: {
        adminId?: string;
        action?: AuditAction;
        startTime?: number;
        endTime?: number;
        success?: boolean;
        limit?: number;
    }): Promise<AuditLogEntry[]> {
        const collection = MongoDBService.getCollection('audit_logs');

        const query: any = {};
        if (filter.adminId) query.adminId = filter.adminId;
        if (filter.action) query.action = filter.action;
        if (filter.success !== undefined) query.success = filter.success;
        if (filter.startTime || filter.endTime) {
            query.timestamp = {};
            if (filter.startTime) query.timestamp.$gte = filter.startTime;
            if (filter.endTime) query.timestamp.$lte = filter.endTime;
        }

        const logs = await collection
            .find(query)
            .sort({ timestamp: -1 })
            .limit(filter.limit || 100)
            .toArray();

        return logs as unknown as AuditLogEntry[];
    }

    /**
     * 🔒 获取统计信息
     */
    static async getStats(): Promise<{
        totalLogs: number;
        lastSequence: number;
        actionBreakdown: Record<string, number>;
        recentFailures: number;
    }> {
        const collection = MongoDBService.getCollection('audit_logs');

        const totalLogs = await collection.countDocuments();

        const lastLog = await collection.findOne(
            {},
            { sort: { sequenceNumber: -1 } }
        ) as unknown as AuditLogEntry | null;

        // 统计各类操作数量
        const actionStats = await collection.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } }
        ]).toArray();

        const actionBreakdown: Record<string, number> = {};
        actionStats.forEach((stat: any) => {
            actionBreakdown[stat._id] = stat.count;
        });

        // 最近1小时的失败操作
        const recentFailures = await collection.countDocuments({
            success: false,
            timestamp: { $gte: Date.now() - 60 * 60 * 1000 }
        });

        return {
            totalLogs,
            lastSequence: lastLog?.sequenceNumber || 0,
            actionBreakdown,
            recentFailures
        };
    }

    /**
     * 🔒 导出审计日志 (用于合规审计)
     */
    static async exportLogs(
        startTime: number,
        endTime: number,
        format: 'json' | 'csv' = 'json'
    ): Promise<string> {
        const logs = await this.queryLogs({
            startTime,
            endTime,
            limit: 100000
        });

        if (format === 'json') {
            return JSON.stringify(logs, null, 2);
        } else {
            // CSV format
            const headers = 'Sequence,Timestamp,AdminID,Username,Action,Resource,IP,Success,Hash,Signature\n';
            const rows = logs.map(log =>
                `${log.sequenceNumber},${new Date(log.timestamp).toISOString()},${log.adminId},${log.username},${log.action},${log.resource || ''},${log.ip || ''},${log.success},${log.currentHash},${log.signature}`
            ).join('\n');
            return headers + rows;
        }
    }
}
