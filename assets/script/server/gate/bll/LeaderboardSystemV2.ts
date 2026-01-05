export enum LeaderboardType {
    Gold = 'gold',
    Tickets = 'tickets',
    Wins = 'wins'
}

export enum LeaderboardCategory {
    Daily = 'daily',
    Weekly = 'weekly',
    AllTime = 'all_time'
}

export interface LeaderboardEntry {
    userId: string;
    username?: string;
    value: number;
    rank?: number;
}
