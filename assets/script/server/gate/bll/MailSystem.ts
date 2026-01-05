export enum MailStatus {
    Unread = 'unread',
    Read = 'read',
    Claimed = 'claimed'
}

export interface MailReward {
    gold?: number;
    tickets?: number;
    items?: Array<{ itemId: string; quantity: number }>;
}

export interface Mail {
    mailId: string;
    title: string;
    content: string;
    status: MailStatus;
    rewards?: MailReward;
    sendAt?: number;
}
