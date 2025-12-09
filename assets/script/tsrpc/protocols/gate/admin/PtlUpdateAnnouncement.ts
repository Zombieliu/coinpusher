import { Announcement } from "../../../../server/gate/bll/AnnouncementSystem";

export interface ReqUpdateAnnouncement {
    __ssoToken?: string;
    announcementId: string;
    updates: Partial<Omit<Announcement, 'announcementId' | 'createdAt' | 'createdBy'>>;
}

export interface ResUpdateAnnouncement {
    success: boolean;
    error?: string;
}
