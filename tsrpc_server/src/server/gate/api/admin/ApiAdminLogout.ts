import { ApiCall } from "tsrpc";
import { AdminUserSystem } from "../../bll/AdminUserSystem";

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
