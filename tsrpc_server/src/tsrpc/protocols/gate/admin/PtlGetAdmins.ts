export interface ReqGetAdmins {
    __ssoToken?: string;
}

export interface ResGetAdmins {
    success: boolean;
    admins?: {
        adminId: string;
        username: string;
        role: string;
        permissions?: string[];
        email?: string;
        status: string;
        createdAt: number;
        lastLoginAt?: number;
    }[];
    error?: string;
}
