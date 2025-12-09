/*
 * @Author: dgflash
 * @Date: 2022-07-02 05:07:07
 * @LastEditors: dgflash
 * @LastEditTime: 2022-07-02 05:15:12
 */
import { ApiCall } from "tsrpc";
import { account } from "../../../../module/account/Account";
import { ReqUserInfo, ResUserInfo } from "../../../../tsrpc/protocols/match/admin/PtlUserInfo";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'match/admin/UserInfo';

/** 获取用户信息 */
export async function ApiUserInfo(call: ApiCall<ReqUserInfo, ResUserInfo>) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        if (call.req.__ssoToken) {
            var dUser = account.parseSSO(call.req.__ssoToken);
            if (dUser) {
                call.succ({ user: dUser });
                success = true;
                return;
            }
            call.error("登录令牌无效");
        }
        else {
            call.error("登录令牌不存在");
        }
    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'user_info_error');
        throw error;
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
