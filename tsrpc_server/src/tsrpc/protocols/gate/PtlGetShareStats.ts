import { ShareStats, ShareRecord } from '../../../server/gate/bll/ShareSystem';

export interface ReqGetShareStats {
    userId: string;
}

export interface ResGetShareStats {
    stats: ShareStats | null;
    history: ShareRecord[];
}
