import { Announcement, AnnouncementType } from "../../../../server/gate/bll/AnnouncementSystem";

export interface ReqGetAnnouncements {
    __ssoToken?: string;
    type?: AnnouncementType;
    activeOnly?: boolean;
    page?: number;
    limit?: number;
}

export interface ResGetAnnouncements {
    success: boolean;
    list: Announcement[];
    total: number;
    error?: string;
}
