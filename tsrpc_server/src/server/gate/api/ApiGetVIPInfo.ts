import { ApiCall } from "tsrpc";
import { ReqGetVIPInfo, ResGetVIPInfo } from "../../../tsrpc/protocols/gate/PtlGetVIPInfo";
import { VIPSystem } from "../bll/VIPSystem";

export async function ApiGetVIPInfo(call: ApiCall<ReqGetVIPInfo, ResGetVIPInfo>) {
    try {
        const { userId } = call.req;
        const vipData = await VIPSystem.getVIPInfo(userId);
        call.succ({ vipData });
    } catch (error) {
        console.error('[ApiGetVIPInfo] Error:', error);
        call.error("获取VIP信息失败");
    }
}
