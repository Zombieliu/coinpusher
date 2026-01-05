export enum BuffType {
    Attack = 'attack',
    Defense = 'defense',
    Speed = 'speed',
    Reward = 'reward'
}

export enum BuffStatus {
    Active = 'active',
    Expired = 'expired',
    Pending = 'pending'
}

export interface BuffEffect {
    effectId?: string;
    type?: BuffType;
    value?: number;
    durationMs?: number;
}

export interface BuffData {
    id?: string;
    type: BuffType;
    status?: BuffStatus;
    effects?: BuffEffect[];
    expiresAt?: number;
}
