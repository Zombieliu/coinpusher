import { ApiCall } from "tsrpc";
import { ReqGetUserRank, ResGetUserRank } from "../../../tsrpc/protocols/gate/PtlGetUserRank";
import {
    LeaderboardCategory,
    LeaderboardSystemV2,
    LeaderboardType
} from "../bll/LeaderboardSystemV2";

export default async function (call: ApiCall<ReqGetUserRank, ResGetUserRank>) {
    const { type, category } = call.req;
    const userId = (call.conn as any)?.userId || (call.req as any).userId;

    if (!userId) {
        call.error('缺少 userId');
        return;
    }

    try {
        const rank = await LeaderboardSystemV2.getUserRank(
            type as LeaderboardType,
            category as LeaderboardCategory,
            userId
        );
        const score = await LeaderboardSystemV2.getUserScore(
            type as LeaderboardType,
            category as LeaderboardCategory,
            userId
        );
        const total = await LeaderboardSystemV2.getLeaderboardSize(
            type as LeaderboardType,
            category as LeaderboardCategory
        );
        const surroundings = await LeaderboardSystemV2.getUserSurroundings(
            type as LeaderboardType,
            category as LeaderboardCategory,
            userId,
            5
        );

        call.succ({
            rank,
            score: score ?? 0,
            total,
            surroundings
        });
    } catch (err: any) {
        call.error(`Leaderboard unavailable: ${err?.message || err}`);
    }
}
