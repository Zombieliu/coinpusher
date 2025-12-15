export interface ReqListAdminSessions {
    __ssoToken?: string;
}

export interface ResListAdminSessions {
    sessions: AdminSessionInfo[];
}

export interface AdminSessionInfo {
    token: string;
    adminId: string;
    username: string;
    role: string;
    createdAt: number;
    expiresAt: number;
    ip?: string;
    userAgent?: string;
    current?: boolean;
}
