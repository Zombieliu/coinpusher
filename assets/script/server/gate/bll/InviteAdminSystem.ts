export enum InviteLeaderboardSort {
    Total = 'total',
    Weekly = 'weekly'
}

export interface InviteLeaderboardEntry {
    userId: string;
    username?: string;
    invited: number;
    rewards?: number;
}
