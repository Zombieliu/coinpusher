import { TaskReward, CheckinData } from '../../../server/gate/bll/TaskSystem';

export interface ReqCheckin {
    // 无参数
}

export interface ResCheckin {
    success: boolean;
    reward?: TaskReward;
    checkinDays?: number;
    consecutiveDays?: number;
    checkinInfo?: CheckinData;
    error?: string;
}
