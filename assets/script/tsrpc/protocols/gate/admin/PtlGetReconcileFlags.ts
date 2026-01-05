export interface ReqGetReconcileFlags {
    page?: number;
    limit?: number;
    type?: 'missing_order' | 'status_mismatch';
    resolved?: boolean;
}

export interface ReconcileFlag {
    _id: string;
    intentId: string;
    type: string;
    orderId?: string;
    stripeStatus?: string;
    dbStatus?: string;
    createdAt: number;
    resolved?: boolean;
    resolvedAt?: number;
    resolutionMessage?: string;
}

export interface ResGetReconcileFlags {
    success: boolean;
    flags?: ReconcileFlag[];
    total?: number;
    error?: string;
}
