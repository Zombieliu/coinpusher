export enum CdkType {
    OneTime = 'one_time',
    MultiUse = 'multi_use'
}

export interface CdkReward {
    itemId?: string;
    quantity?: number;
    gold?: number;
    tickets?: number;
}

export interface CdkCode {
    code: string;
    type: CdkType;
    rewards: CdkReward[];
    used?: boolean;
    expireAt?: number;
}

export interface CdkUsageLog {
    code: string;
    userId: string;
    usedAt: number;
    success: boolean;
    message?: string;
}
