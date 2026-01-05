import { LeaderboardType, LeaderboardCategory, LeaderboardEntry } from '../../../server/gate/bll/LeaderboardSystemV2';

export interface ReqGetLeaderboard {
    type: LeaderboardType;
    category: LeaderboardCategory;
    limit?: number;      // 兼容旧入参：直接指定条数
    page?: number;       // 分页页码（从1开始）
    pageSize?: number;   // 分页大小（默认20，最大200）
}

export interface ResGetLeaderboard {
    leaderboard: LeaderboardEntry[];
    total: number;       // 总条目数
    page: number;        // 当前页码
    pageSize: number;    // 每页条数
    hasNext: boolean;    // 是否还有下一页
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
