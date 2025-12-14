import { ApiCall } from "tsrpc";
import { ReqAdminLogin, ResAdminLogin } from "../../../../tsrpc/protocols/gate/admin/PtlAdminLogin";
import { AdminUserSystem } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";
import { getClientIp, getUserAgent } from "../../utils/RequestMeta";

const ENDPOINT = 'admin/AdminLogin';

// 简易 IP 速率限制：同一 IP 5 分钟内最多 20 次尝试
const ipBuckets: Map<string, { count: number; resetAt: number }> = new Map();
const MAX_ATTEMPTS = 20;
const WINDOW_MS = 5 * 60 * 1000;

function checkRateLimit(ip?: string) {
    if (!ip) return true;
    const now = Date.now();
    const bucket = ipBuckets.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
    if (bucket.resetAt < now) {
        bucket.count = 0;
        bucket.resetAt = now + WINDOW_MS;
    }
    bucket.count += 1;
    ipBuckets.set(ip, bucket);
    return bucket.count <= MAX_ATTEMPTS;
}

export async function ApiAdminLogin(
    call: ApiCall<ReqAdminLogin, ResAdminLogin>
) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        const { username, password, twoFactorCode } = call.req;

        if (!username || !password) {
            call.succ({
                success: false,
                error: '用户名和密码不能为空'
            });
            return;
        }

        // 获取客户端IP 和 UA
        const ip = getClientIp(call);
        const userAgent = getUserAgent(call);
        if (!checkRateLimit(ip)) {
            call.succ({ success: false, error: '尝试过于频繁，请稍后再试' });
            return;
        }

        const result = await AdminUserSystem.login(username, password, ip, twoFactorCode, userAgent);

        if (result.success) {
            call.succ({
                success: true,
                token: result.token!,
                adminUser: result.admin ? {
                    adminId: result.admin.adminId,
                    username: result.admin.username,
                    role: result.admin.role,
                    permissions: result.admin.permissions || []
                } : undefined
            });
            success = true;
        } else {
            call.succ({
                success: false,
                error: result.message || '登录失败'
            });
            success = true;
        }

    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'login_failed');
        console.error('[ApiAdminLogin] Error:', error);
        call.error('Internal server error');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
