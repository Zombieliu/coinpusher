export interface ReqExpandInventory {
    userId: string;
}

export interface ResExpandInventory {
    success: boolean;
    error?: string;
    newMaxSlots?: number;
    cost?: number;
}
