import { VIPData } from '../../../server/gate/bll/VIPSystem';

export interface ReqGetVIPInfo {
    userId: string;
}

export interface ResGetVIPInfo {
    vipData: VIPData;
}
