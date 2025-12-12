import { LeaderboardType, LeaderboardCategory, LeaderboardEntry } from '../../../server/gate/bll/LeaderboardSystemV2';

export interface ReqGetLeaderboard {
    type: LeaderboardType;
    category: LeaderboardCategory;
    limit?: number;  // 默认100
}

export interface ResGetLeaderboard {
    leaderboard: LeaderboardEntry[];
    userRank?: {
        rank: number;
        score: number;
        total: number;
    };
    stats: {
        totalPlayers: number;
        totalScore: number;
        avgScore: number;
        topScore: number;
    };
}
