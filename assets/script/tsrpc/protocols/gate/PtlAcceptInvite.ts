export interface ReqAcceptInvite {
    userId: string;
    inviteCode: string;
}

export interface ResAcceptInvite {
    success: boolean;
    error?: string;
}
