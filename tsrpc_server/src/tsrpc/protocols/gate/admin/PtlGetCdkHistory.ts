import { CdkUsageLog } from "../../../../server/gate/bll/CdkSystem";
import { CdkAdminActionLog } from "../../../../server/gate/bll/CdkAdminSystem";

export type CdkHistoryType = 'usage' | 'actions' | 'all';

export interface ReqGetCdkHistory {
    __ssoToken?: string;
    batchId?: string;
    code?: string;
    type?: CdkHistoryType;
    page?: number;
    limit?: number;
}

export interface ResGetCdkHistory {
    usage: {
        list: CdkUsageLog[];
        total: number;
        page: number;
        pageSize: number;
    };
    actions: {
        list: CdkAdminActionLog[];
        total: number;
        page: number;
        pageSize: number;
    };
}
