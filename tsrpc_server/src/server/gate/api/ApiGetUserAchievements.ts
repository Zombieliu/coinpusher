import { ApiCall } from "tsrpc";
import { ReqGetUserAchievements, ResGetUserAchievements } from "../../../tsrpc/protocols/gate/PtlGetUserAchievements";
import { AchievementSystem } from "../bll/AchievementSystem";

export default async function (call: ApiCall<ReqGetUserAchievements, ResGetUserAchievements>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }

    const achievements = await AchievementSystem.getUserAchievements(userId);
    const total = achievements.length;
    const completed = achievements.filter(a => a.status === 'claimed' || a.status === 'unlocked').length;

    call.succ({
        achievements,
        stats: { total, completed }
    });
}
