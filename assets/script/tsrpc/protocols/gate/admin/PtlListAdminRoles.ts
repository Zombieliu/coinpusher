export interface ReqListAdminRoles {
    __ssoToken?: string;
}

export interface ResListAdminRoles {
    roles: Array<{
        role: string;
        permissions: string[];
        description?: string;
    }>;
}
