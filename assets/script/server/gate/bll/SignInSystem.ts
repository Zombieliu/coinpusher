export interface SignInReward {
    day: number;
    gold?: number;
    tickets?: number;
    items?: Array<{ itemId: string; quantity: number }>;
}

export interface SignInRecord {
    userId: string;
    lastSignInAt: number;
    streak: number;
    history?: number[];
}

export interface SignInConfig {
    rewards: SignInReward[];
    doubleRewardDay?: number;
}
