export interface ReqResolveReconcileFlag {
    flagId: string;
    action: 'confirm' | 'close';
    note?: string;
}

export interface ResResolveReconcileFlag {
    success: boolean;
    error?: string;
    message?: string;
}
