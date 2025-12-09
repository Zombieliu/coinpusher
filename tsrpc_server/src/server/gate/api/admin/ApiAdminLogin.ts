import { ApiCall } from "tsrpc";
import { ReqAdminLogin, ResAdminLogin } from "../../../../tsrpc/protocols/gate/admin/PtlAdminLogin";
import { AdminUserSystem } from "../../bll/AdminUserSystem";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'admin/AdminLogin';

export async function ApiAdminLogin(
    call: ApiCall<ReqAdminLogin, ResAdminLogin>
) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        const { username, password } = call.req;

        if (!username || !password) {
            call.succ({
                success: false,
                error: '用户名和密码不能为空'
            });
            return;
        }

        // 获取客户端IP
        const ip = call.conn.ip;

        const result = await AdminUserSystem.login(username, password, ip);

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
