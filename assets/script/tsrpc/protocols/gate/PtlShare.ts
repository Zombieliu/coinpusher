import { ShareType, ShareChannel, ShareContent } from '../../../server/gate/bll/ShareSystem';

export interface ReqShare {
    userId: string;
    type: ShareType;
    channel: ShareChannel;
    metadata?: any;
}

export interface ResShare {
    success: boolean;
    error?: string;
    shareId?: string;
    content?: ShareContent;
    reward?: number;
}
