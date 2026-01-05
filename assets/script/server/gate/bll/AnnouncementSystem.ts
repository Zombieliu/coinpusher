export enum AnnouncementType {
    System = 'system',
    Event = 'event',
    Maintenance = 'maintenance'
}

export interface Announcement {
    id?: string;
    title: string;
    content?: string;
    type: AnnouncementType;
    createdAt?: number;
    startTime?: number;
    endTime?: number;
}
