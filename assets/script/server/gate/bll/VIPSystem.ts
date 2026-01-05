export interface VIPLevel {
    level: number;
    benefits?: string[];
}

export interface VIPPrivileges {
    bonusGold?: number;
    extraTickets?: number;
    dailyGifts?: number;
}

export interface VIPPurchase {
    level: number;
    durationDays: number;
}

export interface VIPData {
    level: number;
    expireAt?: number;
    privileges?: VIPPrivileges;
}
