import { ApiCall } from "tsrpc";
import { ReqGetJackpotProgress, ResGetJackpotProgress } from "../../../tsrpc/protocols/gate/PtlGetJackpotProgress";
import { UserDB } from "../data/UserDB";

// Jackpot配置常量
const JACKPOT_PROGRESS_PER_DROP = 0.2;  // 每次投币增加0.2进度
const JACKPOT_THRESHOLD = 100;           // 触发阈值

/**
 * 获取Jackpot进度API
 */
export async function ApiGetJackpotProgress(call: ApiCall<ReqGetJackpotProgress, ResGetJackpotProgress>) {
    try {
        const user = await UserDB.getUserById(call.req.userId);

        if (!user) {
            call.error("用户不存在");
            return;
        }

        const currentProgress = user.jackpotProgress || 0;
        const remainingProgress = JACKPOT_THRESHOLD - currentProgress;
        const estimatedDrops = Math.ceil(remainingProgress / JACKPOT_PROGRESS_PER_DROP);

        call.succ({
            jackpotProgress: currentProgress,
            threshold: JACKPOT_THRESHOLD,
            totalDrops: user.totalDrops || 0,
            progressPerDrop: JACKPOT_PROGRESS_PER_DROP,
            estimatedDropsToJackpot: Math.max(0, estimatedDrops)
        });
    } catch (error) {
        console.error('[ApiGetJackpotProgress] Error:', error);
        call.error("获取Jackpot进度失败");
    }
}
