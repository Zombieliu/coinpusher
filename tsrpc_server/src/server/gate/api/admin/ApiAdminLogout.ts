import { ApiCall } from "tsrpc";
import { AdminUserSystem } from "../../bll/AdminUserSystem";
import { AdminAuthMiddleware } from "../../middleware/AdminAuthMiddleware";

export interface ReqAdminLogout {
    __ssoToken?: string;
}

export interface ResAdminLogout {
    success: boolean;
    message?: string;
}

export async function ApiAdminLogout(
    call: ApiCall<ReqAdminLogout, ResAdminLogout>
) {
    try {
        const token = call.req.__ssoToken;

        if (!token) {
            call.succ({
                success: false,
                message: 'Token is required'
            });
            return;
        }

        const verified = await AdminAuthMiddleware.verifyToken(token);
        if (!verified.valid) {
            call.succ({
                success: false,
                message: verified.message || 'Invalid or expired token'
            });
            return;
        }

        await AdminUserSystem.logout(token);

        call.succ({
            success: true,
            message: '登出成功'
        });

    } catch (error) {
        console.error('[ApiAdminLogout] Error:', error);
        call.error('Internal server error');
    }
}
