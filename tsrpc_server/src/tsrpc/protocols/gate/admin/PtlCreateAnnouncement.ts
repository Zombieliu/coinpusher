import { Announcement, AnnouncementType } from "../../../../server/gate/bll/AnnouncementSystem";

export interface ReqCreateAnnouncement {
    __ssoToken?: string;
    type: AnnouncementType;
    title: string;
    content: string;
    startTime: number;
    endTime: number;
    priority?: number;
    platforms?: string[];
    imageUrl?: string;
    linkUrl?: string;
}

export interface ResCreateAnnouncement {
    success: boolean;
    announcementId?: string;
    error?: string;
}
