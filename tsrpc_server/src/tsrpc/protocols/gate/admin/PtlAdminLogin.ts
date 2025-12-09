export interface ReqAdminLogin {
    username: string;
    password: string;
    twoFactorCode?: string;
    __ssoToken?: string;
    __clientIp?: string;
}

export interface ResAdminLogin {
    success: boolean;
    token?: string;
    adminUser?: {
        adminId: string;
        username: string;
        role: string;
        permissions: string[];
        email?: string;
    };
    error?: string;
    requireTwoFactor?: boolean;
}
