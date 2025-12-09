export interface ReqSendFriendGift {
    friendId: string;
}

export interface ResSendFriendGift {
    success: boolean;
    error?: string;
}
