import { ApiCall } from "tsrpc";
import { ReqGetSeasonInfo, ResGetSeasonInfo } from "../../../tsrpc/protocols/gate/PtlGetSeasonInfo";
import { SeasonSystem } from "../bll/SeasonSystem";

export default async function (call: ApiCall<ReqGetSeasonInfo, ResGetSeasonInfo>) {
    const userId = (call.conn as any)?.userId || 'guest';

    const currentSeason = SeasonSystem.getCurrentSeason();
    const userData = SeasonSystem.getUserSeasonData(userId);
    const claimable = SeasonSystem.getClaimableRewards(userId);

    const daysRemaining = Math.max(
        0,
        Math.ceil((currentSeason.endTime - Date.now()) / (24 * 60 * 60 * 1000))
    );

    const stats = {
        level: userData.level,
        exp: userData.exp,
        expToNext: userData.expToNext,
        progress: userData.expToNext ? Math.min(1, userData.exp / userData.expToNext) : 0,
        hasPremiumPass: userData.hasPremiumPass,
        multiplier: userData.multiplier,
        totalClaimedRewards: userData.claimedFreeRewards.length + userData.claimedPremiumRewards.length,
        daysRemaining
    };

    const allRewards = (SeasonSystem as any).LEVEL_REWARDS || [];

    call.succ({
        currentSeason,
        userData,
        stats,
        claimableRewards: claimable,
        allRewards
    });
}
