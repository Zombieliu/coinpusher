import { TaskReward } from '../../../server/gate/bll/TaskSystem';

export interface ReqClaimTaskReward {
    taskId: string;
}

export interface ResClaimTaskReward {
    success: boolean;
    reward?: TaskReward;
    error?: string;
}
