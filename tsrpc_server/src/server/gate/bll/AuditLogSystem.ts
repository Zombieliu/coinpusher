/**
 * 审计日志系统
 * 记录所有管理员的敏感操作，用于安全审计和问题追溯
 */

import { Db } from "mongodb";

export interface AuditLog {
    logId: string;
    adminId: string;
    adminUsername: string;
    action: string;              // 操作类型：create_admin, ban_user, grant_reward等
    category: AuditCategory;     // 分类：user_management, system_config等
    targetType?: string;         // 目标类型：user, admin, config
    targetId?: string;           // 目标ID
    targetName?: string;         // 目标名称（便于显示）
    details: any;                // 操作详情（JSON）
    ipAddress: string;           // 操作IP
    userAgent?: string;          // 浏览器信息
    result: 'success' | 'failed'; // 操作结果
    errorMessage?: string;       // 错误信息（如果失败）
    createdAt: number;           // 时间戳
}

export enum AuditCategory {
    UserManagement = 'user_management',      // 用户管理
    AdminManagement = 'admin_management',    // 管理员管理
    SystemConfig = 'system_config',          // 系统配置
    GameData = 'game_data',                  // 游戏数据
    Financial = 'financial',                 // 财务相关
    Security = 'security',                   // 安全相关
}

export class AuditLogSystem {
    private static db: Db;
    private static collectionName = 'audit_logs';

    static async initialize(db: Db) {
        this.db = db;

        // 创建索引
        const collection = db.collection(this.collectionName);
        await collection.createIndex({ adminId: 1, createdAt: -1 });
        await collection.createIndex({ action: 1, createdAt: -1 });
        await collection.createIndex({ category: 1, createdAt: -1 });
        await collection.createIndex({ targetId: 1 });
        await collection.createIndex({ createdAt: -1 });

        console.log('[审计日志系统] 已初始化');
    }

    /**
     * 记录审计日志
     */
    static async log(params: {
        adminId: string;
        adminUsername: string;
        action: string;
        category: AuditCategory;
        targetType?: string;
        targetId?: string;
        targetName?: string;
        details: any;
        ipAddress: string;
        userAgent?: string;
        result: 'success' | 'failed';
        errorMessage?: string;
    }): Promise<void> {
        const log: AuditLog = {
            logId: this.generateLogId(),
            ...params,
            createdAt: Date.now(),
        };

        try {
            await this.db.collection(this.collectionName).insertOne(log);
        } catch (error) {
            console.error('[AuditLogSystem] 记录审计日志失败:', error);
        }
    }

    /**
     * 查询审计日志
     */
    static async query(params: {
        adminId?: string;
        action?: string;
        category?: AuditCategory;
        targetId?: string;
        startTime?: number;
        endTime?: number;
        result?: 'success' | 'failed';
        page?: number;
        limit?: number;
    }): Promise<{
        logs: AuditLog[];
        total: number;
        page: number;
        pageSize: number;
    }> {
        const {
            adminId,
            action,
            category,
            targetId,
            startTime,
            endTime,
            result,
            page = 1,
            limit = 50,
        } = params;

        const query: any = {};

        if (adminId) query.adminId = adminId;
        if (action) query.action = action;
        if (category) query.category = category;
        if (targetId) query.targetId = targetId;
        if (result) query.result = result;

        if (startTime || endTime) {
            query.createdAt = {};
            if (startTime) query.createdAt.$gte = startTime;
            if (endTime) query.createdAt.$lte = endTime;
        }

        const collection = this.db.collection(this.collectionName);
        const total = await collection.countDocuments(query);
        const logs = await collection
            .find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray() as any[];

        return {
            logs: logs.map(log => ({
                ...log,
                _id: undefined,
            })),
            total,
            page,
            pageSize: limit,
        };
    }

    /**
     * 获取统计信息
     */
    static async getStatistics(params: {
        startTime?: number;
        endTime?: number;
    }): Promise<{
        totalLogs: number;
        successRate: number;
        topActions: { action: string; count: number }[];
        topAdmins: { adminId: string; adminUsername: string; count: number }[];
        categoryDistribution: { category: string; count: number }[];
    }> {
        const { startTime, endTime } = params;
        const query: any = {};

        if (startTime || endTime) {
            query.createdAt = {};
            if (startTime) query.createdAt.$gte = startTime;
            if (endTime) query.createdAt.$lte = endTime;
        }

        const collection = this.db.collection(this.collectionName);

        // 总日志数
        const totalLogs = await collection.countDocuments(query);

        // 成功率
        const successCount = await collection.countDocuments({ ...query, result: 'success' });
        const successRate = totalLogs > 0 ? (successCount / totalLogs) * 100 : 0;

        // Top操作
        const topActionsAgg = await collection.aggregate([
            { $match: query },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]).toArray();

        const topActions = topActionsAgg.map(item => ({
            action: item._id,
            count: item.count,
        }));

        // Top管理员
        const topAdminsAgg = await collection.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { adminId: '$adminId', adminUsername: '$adminUsername' },
                    count: { $sum: 1 },
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]).toArray();

        const topAdmins = topAdminsAgg.map(item => ({
            adminId: item._id.adminId,
            adminUsername: item._id.adminUsername,
            count: item.count,
        }));

        // 分类分布
        const categoryAgg = await collection.aggregate([
            { $match: query },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]).toArray();

        const categoryDistribution = categoryAgg.map(item => ({
            category: item._id,
            count: item.count,
        }));

        return {
            totalLogs,
            successRate,
            topActions,
            topAdmins,
            categoryDistribution,
        };
    }

    /**
     * 获取用户操作历史
     */
    static async getUserHistory(targetId: string, limit = 20): Promise<AuditLog[]> {
        const logs = await this.db.collection(this.collectionName)
            .find({ targetId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray() as any[];

        return logs.map(log => ({ ...log, _id: undefined }));
    }

    /**
     * 生成日志ID
     */
    private static generateLogId(): string {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
