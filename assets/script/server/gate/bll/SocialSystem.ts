export enum FriendStatus {
    Pending = 'pending',
    Accepted = 'accepted',
    Blocked = 'blocked'
}

export interface Friend {
    userId: string;
    nickname?: string;
    status: FriendStatus;
    since?: number;
}

export interface FriendRequest {
    requestId: string;
    fromUserId: string;
    toUserId: string;
    message?: string;
    status: FriendStatus;
    createdAt: number;
}
