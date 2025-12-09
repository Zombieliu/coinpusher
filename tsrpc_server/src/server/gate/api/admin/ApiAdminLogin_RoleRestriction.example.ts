/**
 * 登录接口 - 角色限制版本
 *
 * 使用场景：只允许特定角色登录后台
 *
 * 使用方法：
 * 1. 将此文件重命名为 ApiAdminLogin.ts 替换原文件
 * 2. 或者将 ALLOWED_ROLES 逻辑复制到原 ApiAdminLogin.ts 中
 */

import { ApiCall } from "tsrpc";
import { ReqAdminLogin, ResAdminLogin } from "../../../../tsrpc/protocols/gate/admin/PtlAdminLogin";
import { AdminUserSystem } from "../../bll/AdminUserSystem";
import { AdminRole } from "../../bll/AdminUserSystem";

// ⚙️ 配置：允许登录的角色
const ALLOWED_ROLES: AdminRole[] = [
    AdminRole.Operator,      // 运营人员
    // AdminRole.SuperAdmin, // 取消注释以允许超级管理员登录
    // AdminRole.CustomerService, // 取消注释以允许客服登录
    // AdminRole.Analyst,     // 取消注释以允许数据分析师登录
];

// ⚙️ 配置：工作时间限制（可选）
const WORK_HOURS = {
    enabled: false,  // 设为 true 启用工作时间限制
    start: 9,        // 开始时间（小时）
    end: 18,         // 结束时间（小时）
    timezone: 8      // 时区 UTC+8
};

export async function ApiAdminLogin(call: ApiCall<ReqAdminLogin, ResAdminLogin>) {
    const { username, password, twoFactorCode } = call.req;

    // 1. 验证账号密码
    const loginResult = await AdminUserSystem.login(username, password, call.req.__ssoToken);

    if (!loginResult.success) {
        call.succ({
            success: false,
            error: loginResult.message || '登录失败'
        });
        return;
    }

    const { token, admin } = loginResult;

    // 2. 🔒 角色限制检查
    if (!ALLOWED_ROLES.includes(admin.role as AdminRole)) {
        // 记录未授权的登录尝试
        call.logger.warn(`[安全] 未授权角色尝试登录: ${username} (${admin.role})`);

        call.succ({
            success: false,
            error: '您的账号无权访问此系统'
        });
        return;
    }

    // 3. 🕐 工作时间限制检查（可选）
    if (WORK_HOURS.enabled) {
        const now = new Date();
        const currentHour = (now.getUTCHours() + WORK_HOURS.timezone) % 24;

        // SuperAdmin 不受工作时间限制
        if (admin.role !== AdminRole.SuperAdmin) {
            if (currentHour < WORK_HOURS.start || currentHour >= WORK_HOURS.end) {
                call.logger.warn(`[安全] 非工作时间登录尝试: ${username} (${currentHour}:00)`);

                call.succ({
                    success: false,
                    error: `仅允许在工作时间 ${WORK_HOURS.start}:00-${WORK_HOURS.end}:00 登录`
                });
                return;
            }
        }
    }

    // 4. 二次验证检查
    if (admin.twoFactor?.enabled) {
        if (!twoFactorCode) {
            call.succ({
                success: false,
                error: '请输入双因素认证码',
                requireTwoFactor: true
            });
            return;
        }

        const { TwoFactorAuth } = await import('../../../utils/TwoFactorAuth');
        const isValid = TwoFactorAuth.verifyToken(admin.twoFactor.secret!, twoFactorCode);

        if (!isValid) {
            call.succ({
                success: false,
                error: '双因素认证码错误'
            });
            return;
        }
    }

    // 5. 登录成功
    call.logger.log(`[登录成功] ${username} (${admin.role}) - IP: ${call.req.__clientIp || 'unknown'}`);

    call.succ({
        success: true,
        token: token,
        adminUser: {
            adminId: admin.adminId,
            username: admin.username,
            role: admin.role,
            email: admin.email,
            permissions: admin.permissions || []
        }
    });
}
