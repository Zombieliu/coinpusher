import { TaskReward } from '../../../server/gate/bll/TaskSystem';

export interface ReqClaimAchievementReward {
    achievementId: string;
}

export interface ResClaimAchievementReward {
    success: boolean;
    reward?: TaskReward;
    title?: string;
    error?: string;
}
