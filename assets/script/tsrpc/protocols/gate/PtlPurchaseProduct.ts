export interface ReqPurchaseProduct {
    userId: string;
    productId: string;
    quantity?: number;
}

export interface ResPurchaseProduct {
    success: boolean;
    error?: string;
    recordId?: string;
}
