export interface LevelReward {
    level: number;
    gold?: number;
    tickets?: number;
    items?: Array<{ itemId: string; quantity: number }>;
}

export interface LevelData {
    level: number;
    exp: number;
    nextLevelExp: number;
    rewards?: LevelReward[];
}
