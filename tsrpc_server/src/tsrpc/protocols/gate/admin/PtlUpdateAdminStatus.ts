export interface ReqUpdateAdminStatus {
    __ssoToken?: string;
    adminId: string;
    status: 'active' | 'disabled';
}

export interface ResUpdateAdminStatus {
    success: boolean;
    error?: string;
}
