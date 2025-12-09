import { ApiCall } from "tsrpc";
import { sr } from "../../../../ServerRoom";
import { ReqAuth, ResAuth } from "../../../../tsrpc/protocols/room/admin/PtlAuth";
import { ApiTimer, recordApiError } from "../../../utils/MetricsCollector";

const ENDPOINT = 'room/admin/Auth';

/** 加入匹配服务器成功 */
export async function ApiAuth(call: ApiCall<ReqAuth, ResAuth>) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        sr.auth(call);
        success = true;
    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'auth_error');
        throw error;
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
