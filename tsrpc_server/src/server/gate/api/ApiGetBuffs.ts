import { ApiCall } from "tsrpc";
import { ReqGetBuffs, ResGetBuffs } from "../../../tsrpc/protocols/gate/PtlGetBuffs";
import { BuffSystem } from "../bll/BuffSystem";

/**
 * 获取用户当前激活的Buff API
 */
export async function ApiGetBuffs(call: ApiCall<ReqGetBuffs, ResGetBuffs>) {
    try {
        const { userId } = call.req;

        // 获取激活的buff
        const buffs = await BuffSystem.getUserActiveBuffs(userId);

        // 计算当前奖励倍率
        const rewardMultiplier = await BuffSystem.calculateRewardMultiplier(userId);

        call.succ({
            activeBuffs: buffs,
            effects: [],
            timers: {}
        });
    } catch (error) {
        console.error('[ApiGetBuffs] Error:', error);
        call.error("获取Buff失败");
    }
}
