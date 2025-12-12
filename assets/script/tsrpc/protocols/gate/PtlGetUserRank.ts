import { LeaderboardType, LeaderboardCategory, LeaderboardEntry } from '../../../server/gate/bll/LeaderboardSystemV2';

export interface ReqGetUserRank {
    type: LeaderboardType;
    category: LeaderboardCategory;
}

export interface ResGetUserRank {
    rank: number | null;
    score: number;
    total: number;
    surroundings: LeaderboardEntry[];  // 周围排名（前后5名）
}
