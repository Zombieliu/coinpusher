import { CdkReward } from "../../../server/gate/bll/CdkSystem";

export interface ReqExchangeCdk {
    code: string;
}

export interface ResExchangeCdk {
    success: boolean;
    rewards?: CdkReward;
    error?: string;
}
