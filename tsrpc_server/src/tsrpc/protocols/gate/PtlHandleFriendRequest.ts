export interface ReqHandleFriendRequest {
    requestId: string;
    accept: boolean;  // true=接受, false=拒绝
}

export interface ResHandleFriendRequest {
    success: boolean;
    error?: string;
}
