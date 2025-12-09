import { ApiCall } from "tsrpc";
import { account } from "../../../../module/account/Account";
import { ReqLogined, ResLogined } from "../../../../tsrpc/protocols/match/admin/PtlLogined";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'match/admin/Logined';

/** 缓存网关服务器发过来的玩家登录数据 */
export async function ApiLogined(call: ApiCall<ReqLogined, ResLogined>) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        call.logger.log(`匹配服务器[${call.req.user.username}]已登录`);

        var user = call.req.user;
        account.AccountModel.users.set(user.key, user);
        var sso = await account.createSsoToken(user.key);

        call.succ({ __ssoToken: sso });
        success = true;
    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'logined_error');
        call.error('Failed to cache login state');
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
