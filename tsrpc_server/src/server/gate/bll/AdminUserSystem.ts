import { MongoDBService } from "../db/MongoDBService";
import * as crypto from 'crypto';
import { validatePassword } from "../../utils/PasswordValidator";
import { TwoFactorAuth, TwoFactorData, TwoFactorSetup } from "../../utils/TwoFactorAuth";

export enum AdminRole {
    SuperAdmin = 'super_admin',    // 超级管理员 - 所有权限
    Operator = 'operator',          // 运营人员 - 邮件、活动、配置
    CustomerService = 'customer_service', // 客服 - 用户管理、封禁
    Analyst = 'analyst'             // 数据分析 - 只读权限
}

export enum AdminPermission {
    // 用户管理权限
    ViewUsers = 'view_users',
    BanUsers = 'ban_users',
    GrantRewards = 'grant_rewards',

    // 邮件权限
    SendMail = 'send_mail',
    SendBroadcastMail = 'send_broadcast_mail',

    // 配置权限
    ViewConfig = 'view_config',
    EditConfig = 'edit_config',

    // 活动权限
    ViewEvents = 'view_events',
    EditEvents = 'edit_events',

    // 统计权限
    ViewStatistics = 'view_statistics',

    // 财务权限
    ViewFinance = 'view_finance',
    ManageFinance = 'manage_finance',

    // 日志权限
    ViewLogs = 'view_logs',

    // 系统权限
    ManageAdmins = 'manage_admins',
    SystemConfig = 'system_config'
}

// 角色权限映射
const RolePermissions: Record<AdminRole, AdminPermission[]> = {
    [AdminRole.SuperAdmin]: Object.values(AdminPermission), // 所有权限

    [AdminRole.Operator]: [
        AdminPermission.ViewUsers,
        AdminPermission.SendMail,
        AdminPermission.SendBroadcastMail,
        AdminPermission.ViewConfig,
        AdminPermission.EditConfig,
        AdminPermission.ViewEvents,
        AdminPermission.EditEvents,
        AdminPermission.ViewStatistics,
        AdminPermission.ViewFinance,
        AdminPermission.ViewLogs
    ],

    [AdminRole.CustomerService]: [
        AdminPermission.ViewUsers,
        AdminPermission.BanUsers,
        AdminPermission.GrantRewards,
        AdminPermission.SendMail, // 只能单发，不能群发
        AdminPermission.ViewFinance,
        AdminPermission.ViewLogs
    ],

    [AdminRole.Analyst]: [
        AdminPermission.ViewUsers,
        AdminPermission.ViewConfig,
        AdminPermission.ViewEvents,
        AdminPermission.ViewStatistics,
        AdminPermission.ViewFinance,
        AdminPermission.ViewLogs
    ]
};

export interface AdminUser {
    adminId: string;
    username: string;
    passwordHash: string;
    role: AdminRole;
    permissions?: string[];
    email?: string;
    status: 'active' | 'disabled';
    createdAt: number;
    lastLoginAt?: number;
    lastLoginIp?: string;
    // 🔒 安全增强字段
    failedLoginAttempts?: number;      // 失败登录次数
    lockedUntil?: number;              // 账号锁定到期时间
    passwordChangedAt?: number;        // 密码修改时间
    requirePasswordChange?: boolean;   // 是否需要修改密码
    // 🔒 二次验证 (2FA)
    twoFactor?: TwoFactorData;         // 2FA配置数据
}

export interface AdminSession {
    adminId: string;
    username: string;
    role: AdminRole;
    token: string;
    createdAt: number;
    expiresAt: number;
    ip?: string;
    // 🔒 2FA验证状态
    twoFactorVerified?: boolean;       // 是否已完成2FA验证
}

export class AdminUserSystem {
    private static get adminsCollection() {
        return MongoDBService.getCollection<AdminUser>('admin_users');
    }

    private static get sessionsCollection() {
        return MongoDBService.getCollection<AdminSession>('admin_sessions');
    }

    /**
     * 初始化系统 - 创建默认超级管理员
     */
    static async initialize(): Promise<void> {
        const existingAdmin = await this.adminsCollection.findOne({
            role: AdminRole.SuperAdmin
        });

        if (!existingAdmin) {
            // 创建默认超级管理员
            const defaultAdmin: AdminUser = {
                adminId: 'admin_' + Date.now(),
                username: 'admin',
                passwordHash: this.hashPassword('admin123'),
                role: AdminRole.SuperAdmin,
                email: 'admin@example.com',
                status: 'active',
                createdAt: Date.now()
            };

            await this.adminsCollection.insertOne(defaultAdmin);
            console.log('[AdminUserSystem] Default super admin created: admin/admin123');
        }

        // 创建索引
        await this.adminsCollection.createIndex({ username: 1 }, { unique: true });
        await this.adminsCollection.createIndex({ adminId: 1 }, { unique: true });
        await this.sessionsCollection.createIndex({ token: 1 }, { unique: true });
        await this.sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    }

    /**
     * 管理员登录
     */
    static async login(
        username: string,
        password: string,
        ip?: string
    ): Promise<{ success: boolean; token?: string; message?: string; admin?: AdminUser }> {
        const admin = await this.adminsCollection.findOne({ username });

        if (!admin) {
            return { success: false, message: '用户名或密码错误' };
        }

        if (admin.status !== 'active') {
            return { success: false, message: '账号已被禁用' };
        }

        // 🔒 检查账号是否被锁定
        const MAX_FAILED_ATTEMPTS = 5;
        const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15分钟

        if (admin.lockedUntil && admin.lockedUntil > Date.now()) {
            const remainingMinutes = Math.ceil((admin.lockedUntil - Date.now()) / 60000);
            return {
                success: false,
                message: `账号已被锁定，请在 ${remainingMinutes} 分钟后重试`
            };
        }

        // 验证密码
        const passwordHash = this.hashPassword(password);
        if (passwordHash !== admin.passwordHash) {
            // 🔒 记录失败尝试
            const failedAttempts = (admin.failedLoginAttempts || 0) + 1;
            const updateData: any = {
                failedLoginAttempts: failedAttempts,
                lastLoginAt: Date.now()
            };

            // 如果达到最大尝试次数，锁定账号
            if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                updateData.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
                await this.adminsCollection.updateOne(
                    { adminId: admin.adminId },
                    { $set: updateData }
                );
                return {
                    success: false,
                    message: `登录失败次数过多，账号已被锁定 ${LOCKOUT_DURATION_MS / 60000} 分钟`
                };
            }

            await this.adminsCollection.updateOne(
                { adminId: admin.adminId },
                { $set: updateData }
            );

            return {
                success: false,
                message: `用户名或密码错误 (剩余尝试次数: ${MAX_FAILED_ATTEMPTS - failedAttempts})`
            };
        }

        // 🔒 检查是否需要修改密码
        if (admin.requirePasswordChange) {
            return {
                success: false,
                message: '首次登录需要修改密码'
            };
        }

        // 生成会话token
        const token = this.generateToken();
        const session: AdminSession = {
            adminId: admin.adminId,
            username: admin.username,
            role: admin.role,
            token,
            createdAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时
            ip
        };

        await this.sessionsCollection.insertOne(session);

        // 🔒 更新最后登录时间并清除失败计数
        await this.adminsCollection.updateOne(
            { adminId: admin.adminId },
            {
                $set: {
                    lastLoginAt: Date.now(),
                    lastLoginIp: ip,
                    failedLoginAttempts: 0,  // 清除失败计数
                    lockedUntil: null        // 解除锁定
                }
            }
        );

        return {
            success: true,
            token,
            admin: {
                ...admin,
                passwordHash: '' // 不返回密码
            }
        };
    }

    /**
     * 验证token并获取会话信息
     */
    static async validateToken(token: string): Promise<AdminSession | null> {
        if (!token) return null;

        const session = await this.sessionsCollection.findOne({
            token,
            expiresAt: { $gt: Date.now() }
        });

        return session;
    }

    /**
     * 检查权限
     */
    static hasPermission(role: AdminRole, permission: AdminPermission): boolean {
        const permissions = RolePermissions[role] || [];
        return permissions.includes(permission);
    }

    /**
     * 登出
     */
    static async logout(token: string): Promise<void> {
        await this.sessionsCollection.deleteOne({ token });
    }

    /**
     * 创建管理员用户（仅超级管理员可用）
     */
    static async createAdmin(
        username: string,
        password: string,
        role: AdminRole,
        email?: string
    ): Promise<{ success: boolean; adminId?: string; message?: string }> {
        // 检查用户名是否已存在
        const existing = await this.adminsCollection.findOne({ username });
        if (existing) {
            return { success: false, message: '用户名已存在' };
        }

        const newAdmin: AdminUser = {
            adminId: 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            username,
            passwordHash: this.hashPassword(password),
            role,
            email,
            status: 'active',
            createdAt: Date.now()
        };

        await this.adminsCollection.insertOne(newAdmin);

        return {
            success: true,
            adminId: newAdmin.adminId,
            message: '管理员创建成功'
        };
    }

    /**
     * 修改管理员状态
     */
    static async updateAdminStatus(
        adminId: string,
        status: 'active' | 'disabled'
    ): Promise<{ success: boolean; message?: string }> {
        const result = await this.adminsCollection.updateOne(
            { adminId },
            { $set: { status } }
        );

        if (result.modifiedCount > 0) {
            // 如果禁用，删除所有会话
            if (status === 'disabled') {
                await this.sessionsCollection.deleteMany({ adminId });
            }
            return { success: true };
        }

        return { success: false, message: '管理员不存在' };
    }

    /**
     * 修改密码
     */
    static async changePassword(
        adminId: string,
        oldPassword: string,
        newPassword: string
    ): Promise<{ success: boolean; message?: string }> {
        const admin = await this.adminsCollection.findOne({ adminId });

        if (!admin) {
            return { success: false, message: '管理员不存在' };
        }

        const oldPasswordHash = this.hashPassword(oldPassword);
        if (oldPasswordHash !== admin.passwordHash) {
            return { success: false, message: '原密码错误' };
        }

        await this.adminsCollection.updateOne(
            { adminId },
            { $set: { passwordHash: this.hashPassword(newPassword) } }
        );

        // 删除所有会话，强制重新登录
        await this.sessionsCollection.deleteMany({ adminId });

        return { success: true, message: '密码修改成功，请重新登录' };
    }

    /**
     * 获取管理员列表
     */
    static async listAdmins(): Promise<AdminUser[]> {
        const admins = await this.adminsCollection
            .find({})
            .project({ passwordHash: 0 }) // 不返回密码
            .toArray();

        return admins as AdminUser[];
    }

    /**
     * 密码哈希
     */
    private static hashPassword(password: string): string {
        return crypto
            .createHash('sha256')
            .update(password + 'coinpusher_admin_salt')
            .digest('hex');
    }

    /**
     * 生成token
     */
    private static generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * 记录管理员操作
     */
    static async logAdminAction(
        adminId: string,
        action: string,
        details: any
    ): Promise<void> {
        try {
            const logsCollection = MongoDBService.getCollection('admin_logs');
            await logsCollection.insertOne({
                adminId,
                action,
                details,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[AdminUserSystem] Failed to log action:', error);
        }
    }

    // ==================== 🔒 二次验证 (2FA) ====================

    /**
     * 🔒 启用2FA - 生成设置信息
     * @param adminId 管理员ID
     */
    static async setup2FA(adminId: string): Promise<{ success: boolean; setup?: TwoFactorSetup; message?: string }> {
        const admin = await this.adminsCollection.findOne({ adminId });
        if (!admin) {
            return { success: false, message: '管理员不存在' };
        }

        if (admin.twoFactor?.enabled) {
            return { success: false, message: '2FA已启用，请先禁用后再重新设置' };
        }

        // 生成2FA设置
        const setup = await TwoFactorAuth.generateSetup(admin.username, 'CoinPusher Admin');

        // 保存到数据库（未启用状态）
        await this.adminsCollection.updateOne(
            { adminId },
            {
                $set: {
                    twoFactor: {
                        secret: setup.secret,
                        enabled: false,
                        backupCodes: setup.backupCodes
                    }
                }
            }
        );

        await this.logAdminAction(adminId, '2FA_SETUP_INITIATED', { username: admin.username });

        return { success: true, setup };
    }

    /**
     * 🔒 启用2FA - 验证并激活
     * @param adminId 管理员ID
     * @param token 用户输入的6位验证码
     */
    static async enable2FA(adminId: string, token: string): Promise<{ success: boolean; message?: string }> {
        const admin = await this.adminsCollection.findOne({ adminId });
        if (!admin) {
            return { success: false, message: '管理员不存在' };
        }

        if (!admin.twoFactor?.secret) {
            return { success: false, message: '请先调用setup2FA生成密钥' };
        }

        if (admin.twoFactor.enabled) {
            return { success: false, message: '2FA已启用' };
        }

        // 验证TOTP令牌
        const isValid = TwoFactorAuth.verifyToken(admin.twoFactor.secret, token);
        if (!isValid) {
            return { success: false, message: '验证码错误' };
        }

        // 激活2FA
        await this.adminsCollection.updateOne(
            { adminId },
            {
                $set: {
                    'twoFactor.enabled': true,
                    'twoFactor.lastUsedAt': Date.now()
                }
            }
        );

        await this.logAdminAction(adminId, '2FA_ENABLED', { username: admin.username });

        return { success: true, message: '2FA已成功启用' };
    }

    /**
     * 🔒 禁用2FA
     * @param adminId 管理员ID
     * @param password 管理员密码（必须验证密码后才能禁用）
     */
    static async disable2FA(adminId: string, password: string): Promise<{ success: boolean; message?: string }> {
        const admin = await this.adminsCollection.findOne({ adminId });
        if (!admin) {
            return { success: false, message: '管理员不存在' };
        }

        // 验证密码
        const passwordHash = this.hashPassword(password);
        if (passwordHash !== admin.passwordHash) {
            return { success: false, message: '密码错误' };
        }

        if (!admin.twoFactor?.enabled) {
            return { success: false, message: '2FA未启用' };
        }

        // 禁用2FA
        await this.adminsCollection.updateOne(
            { adminId },
            { $unset: { twoFactor: '' } }
        );

        await this.logAdminAction(adminId, '2FA_DISABLED', { username: admin.username });

        return { success: true, message: '2FA已禁用' };
    }

    /**
     * 🔒 验证2FA令牌（登录时调用）
     * @param adminId 管理员ID
     * @param token 用户输入的6位验证码或备用恢复码
     */
    static async verify2FA(
        adminId: string,
        token: string
    ): Promise<{ success: boolean; message?: string; usedBackupCode?: boolean }> {
        const admin = await this.adminsCollection.findOne({ adminId });
        if (!admin) {
            return { success: false, message: '管理员不存在' };
        }

        if (!admin.twoFactor?.enabled || !admin.twoFactor.secret) {
            return { success: false, message: '2FA未启用' };
        }

        // 尝试验证TOTP令牌
        const isValidToken = TwoFactorAuth.verifyToken(admin.twoFactor.secret, token);
        if (isValidToken) {
            await this.adminsCollection.updateOne(
                { adminId },
                { $set: { 'twoFactor.lastUsedAt': Date.now() } }
            );

            await this.logAdminAction(adminId, '2FA_VERIFIED', { method: 'TOTP' });
            return { success: true };
        }

        // 尝试验证备用恢复码
        if (admin.twoFactor.backupCodes && admin.twoFactor.backupCodes.length > 0) {
            const backupResult = TwoFactorAuth.verifyBackupCode(admin.twoFactor.backupCodes, token);
            if (backupResult.valid) {
                // 更新剩余的恢复码
                await this.adminsCollection.updateOne(
                    { adminId },
                    {
                        $set: {
                            'twoFactor.backupCodes': backupResult.remainingCodes,
                            'twoFactor.lastUsedAt': Date.now()
                        }
                    }
                );

                await this.logAdminAction(adminId, '2FA_VERIFIED', {
                    method: 'BACKUP_CODE',
                    remainingCodes: backupResult.remainingCodes.length
                });

                return {
                    success: true,
                    usedBackupCode: true,
                    message: `验证成功。剩余 ${backupResult.remainingCodes.length} 个恢复码`
                };
            }
        }

        return { success: false, message: '验证码或恢复码错误' };
    }

    /**
     * 🔒 重新生成备用恢复码
     * @param adminId 管理员ID
     * @param password 管理员密码（必须验证密码）
     */
    static async regenerateBackupCodes(
        adminId: string,
        password: string
    ): Promise<{ success: boolean; backupCodes?: string[]; message?: string }> {
        const admin = await this.adminsCollection.findOne({ adminId });
        if (!admin) {
            return { success: false, message: '管理员不存在' };
        }

        // 验证密码
        const passwordHash = this.hashPassword(password);
        if (passwordHash !== admin.passwordHash) {
            return { success: false, message: '密码错误' };
        }

        if (!admin.twoFactor?.enabled) {
            return { success: false, message: '2FA未启用' };
        }

        // 生成新的恢复码
        const newBackupCodes = TwoFactorAuth.regenerateBackupCodes(8);

        await this.adminsCollection.updateOne(
            { adminId },
            { $set: { 'twoFactor.backupCodes': newBackupCodes } }
        );

        await this.logAdminAction(adminId, '2FA_BACKUP_CODES_REGENERATED', { username: admin.username });

        return { success: true, backupCodes: newBackupCodes };
    }

    /**
     * 🔒 检查管理员是否需要2FA验证
     */
    static async requires2FA(adminId: string): Promise<boolean> {
        const admin = await this.adminsCollection.findOne({ adminId });
        return admin?.twoFactor?.enabled || false;
    }
}
