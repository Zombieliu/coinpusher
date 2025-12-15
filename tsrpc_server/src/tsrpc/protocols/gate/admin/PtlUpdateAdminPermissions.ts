export interface ReqUpdateAdminPermissions {
    __ssoToken?: string;
    adminId: string;
    permissions: string[];
}

export interface ResUpdateAdminPermissions {
    success: boolean;
    message?: string;
}
