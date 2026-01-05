export enum ShareType {
    Link = 'link',
    Image = 'image',
    Video = 'video'
}

export enum ShareChannel {
    Discord = 'discord',
    Twitter = 'twitter',
    Facebook = 'facebook',
    Unknown = 'unknown'
}

export interface ShareContent {
    title?: string;
    url?: string;
    image?: string;
    description?: string;
}

export interface ShareRecord {
    shareId: string;
    userId: string;
    type: ShareType;
    channel: ShareChannel;
    createdAt: number;
}

export interface ShareStats {
    totalShares: number;
    lastShareAt?: number;
    channels?: Partial<Record<ShareChannel, number>>;
}
