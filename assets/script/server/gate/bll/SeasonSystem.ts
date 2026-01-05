export enum BattlePassType {
    Free = 'free',
    Premium = 'premium'
}

export interface LevelReward {
    level: number;
    gold?: number;
    tickets?: number;
}

export interface SeasonConfig {
    seasonId: string;
    name?: string;
    status?: string;
    startAt?: number;
    endAt?: number;
    rewards?: LevelReward[];
}

export interface UserSeasonData {
    seasonId: string;
    level: number;
    exp: number;
    rewardsClaimed?: string[];
}
