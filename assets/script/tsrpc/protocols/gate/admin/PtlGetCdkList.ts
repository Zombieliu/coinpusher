import { CdkType, CdkCode } from "../../../../server/gate/bll/CdkSystem";

export interface ReqGetCdkList {
    __ssoToken?: string;
    batchId?: string;
    code?: string;
    type?: CdkType;
    active?: boolean;
    page?: number;
    limit?: number;
}

export interface ResGetCdkList {
    success: boolean;
    list: CdkCode[];
    total: number;
    error?: string;
}
