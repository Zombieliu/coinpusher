import { CdkType, CdkReward, CdkCode } from "../../../../server/gate/bll/CdkSystem";

export interface ReqGenerateCdk {
    __ssoToken?: string;
    name: string;
    type: CdkType;
    rewards: CdkReward;
    count: number;
    usageLimit: number; // -1 for infinite
    prefix?: string;
    expireAt: number;
}

export interface ResGenerateCdk {
    success: boolean;
    batchId?: string;
    codes?: string[]; // 只在生成数量较少时返回，或者返回下载链接
    error?: string;
}
