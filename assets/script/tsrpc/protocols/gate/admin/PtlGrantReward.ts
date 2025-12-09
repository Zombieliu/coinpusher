export interface ReqGrantReward {
    __ssoToken?: string;
    userId: string;
    reason?: string;
    rewards: {
        gold?: number;
        tickets?: number;
        exp?: number;
        items?: Array<{ itemId: string; quantity: number }>;
        skins?: string[];
        vipDays?: number;
    };
}

export interface ResGrantReward {
    success: boolean;
    message?: string;
}
