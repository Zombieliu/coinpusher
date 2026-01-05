export interface ReqGetUsers {
    __ssoToken?: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    channel?: string;
    platform?: 'ios' | 'android' | 'pc';
    web3Bound?: boolean;
}

export interface ResGetUsers {
    users: UserSummary[];
    total: number;
    page: number;
    limit: number;
}

export interface UserSummary {
    userId: string;
    username: string;
    gold: number;
    status: string;
    lastLoginTime: number;
    createdAt: number;
    channel?: string;
    campaign?: string;
    platform?: 'ios' | 'android' | 'pc';
    clientVersion?: string;
    web3Bound?: boolean;
}
