export interface ReqDeleteAnnouncement {
    __ssoToken?: string;
    announcementId: string;
}

export interface ResDeleteAnnouncement {
    success: boolean;
    error?: string;
}
