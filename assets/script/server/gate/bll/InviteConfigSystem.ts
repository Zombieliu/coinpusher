export enum InviteConfigReviewStatus {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected'
}

export interface InviteRewardConfigRecord {
    configId: string;
    createdAt: number;
    status: InviteConfigReviewStatus;
    reviewer?: string;
}

export interface InviteRewardConfigHistory extends InviteRewardConfigRecord {
    reason?: string;
    snapshot?: any;
}
