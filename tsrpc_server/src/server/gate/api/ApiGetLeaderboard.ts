import { ApiCall } from "tsrpc";
import { ReqGetLeaderboard, ResGetLeaderboard } from "../../../tsrpc/protocols/gate/PtlGetLeaderboard";
import {
    LeaderboardCategory,
    LeaderboardSystemV2,
    LeaderboardType
} from "../bll/LeaderboardSystemV2";

export default async function (call: ApiCall<ReqGetLeaderboard, ResGetLeaderboard>) {
    const { type, category, page, pageSize, limit } = call.req as any;
    // 兼容旧入参：如传 limit 则沿用；否则使用分页，默认 page=1,pageSize=20
    const usePaging = page !== undefined || pageSize !== undefined;
    const finalPage = usePaging ? Math.max(1, Number(page) || 1) : 1;
    const finalSize = usePaging
        ? Math.min(Math.max(1, Number(pageSize) || 20), 200)
        : Math.min(limit ?? 100, 200);
    const offset = usePaging ? (finalPage - 1) * finalSize : 0;

    try {
        const { entries: leaderboard, total } = await LeaderboardSystemV2.getLeaderboardPage(
            type as LeaderboardType,
            category as LeaderboardCategory,
            finalPage,
            finalSize
        );

        const stats = await LeaderboardSystemV2.getLeaderboardStats(
            type as LeaderboardType,
            category as LeaderboardCategory
        );

        // 如果请求里带 userId，则补充 userRank
        const userId = (call.conn as any)?.userId || (call.req as any).userId;
        let userRank: ResGetLeaderboard['userRank'] | undefined;
        if (userId) {
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
            userRank = { rank, score: score ?? 0, total };
        }

        call.succ({
            leaderboard,
            userRank,
            stats,
            total,
            page: finalPage,
            pageSize: finalSize,
            hasNext: offset + leaderboard.length < total
        });
    } catch (err: any) {
        call.error(`Leaderboard unavailable: ${err?.message || err}`);
    }
}
