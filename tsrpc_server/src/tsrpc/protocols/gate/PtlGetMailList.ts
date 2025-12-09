import { Mail, MailStatus } from '../../../server/gate/bll/MailSystem';

export interface ReqGetMailList {
    userId: string;
    status?: MailStatus;
    page?: number;
    pageSize?: number;
}

export interface ResGetMailList {
    mails: Mail[];
    unreadCount: number;
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
}
