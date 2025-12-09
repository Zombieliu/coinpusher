import { ApiCall } from "tsrpc";
import { ReqGetLevelInfo, ResGetLevelInfo } from "../../../tsrpc/protocols/gate/PtlGetLevelInfo";
import { LevelSystem } from "../bll/LevelSystem";

export async function ApiGetLevelInfo(call: ApiCall<ReqGetLevelInfo, ResGetLevelInfo>) {
    try {
        const { userId } = call.req;
        const levelData = await LevelSystem.getLevelInfo(userId);
        call.succ({ levelData });
    } catch (error) {
        console.error('[ApiGetLevelInfo] Error:', error);
        call.error("获取等级信息失败");
    }
}
