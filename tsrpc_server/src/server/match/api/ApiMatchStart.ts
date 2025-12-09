import { ApiCallHttp } from "tsrpc";
import { sm } from "../../../ServerMatch";
import { ReqMatchStart, ResMatchStart } from "../../../tsrpc/protocols/match/PtlMatchStart";
import { ApiTimer, recordApiError } from "../../utils/MetricsCollector";

const ENDPOINT = 'match/MatchStart';

/** 加入匹配队列，待匹配 */
export async function ApiMatchStart(call: ApiCallHttp<ReqMatchStart, ResMatchStart>) {
    const timer = new ApiTimer('POST', ENDPOINT);
    let success = false;

    try {
        sm.MatchModel.queue.add(call);
        success = true;
    } catch (error: any) {
        recordApiError('POST', ENDPOINT, error?.message || 'match_queue_error');
        throw error;
    } finally {
        timer.end(success ? 'success' : 'error');
    }
}
