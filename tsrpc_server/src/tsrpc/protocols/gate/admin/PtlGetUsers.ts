export interface ReqGetUsers {
    __ssoToken?: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}

export interface ResGetUsers {
    users: Array<{
        userId: string;
        username: string;
        gold: number;
        status: string;
        lastLoginTime: number;
        createdAt: number;
    }>;
    total: number;
    page: number;
    limit: number;
}
