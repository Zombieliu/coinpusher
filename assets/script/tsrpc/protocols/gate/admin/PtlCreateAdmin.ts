export interface ReqCreateAdmin {
    __ssoToken?: string;
    username: string;
    password: string;
    role: 'super_admin' | 'operator' | 'customer_service' | 'analyst';
    email?: string;
}

export interface ResCreateAdmin {
    success: boolean;
    adminId?: string;
    error?: string;
}
