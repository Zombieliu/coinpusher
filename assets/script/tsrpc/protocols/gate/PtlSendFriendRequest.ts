export interface ReqSendFriendRequest {
    toUserId: string;
    message?: string;
}

export interface ResSendFriendRequest {
    success: boolean;
    error?: string;
    requestId?: string;
}
