import { BattlePassType } from '../../../server/gate/bll/SeasonSystem';
import { TaskReward } from '../../../server/gate/bll/TaskSystem';

export interface ReqClaimSeasonReward {
    level: number;
    type: BattlePassType;  // 'free' 或 'premium'
}

export interface ResClaimSeasonReward {
    success: boolean;
    reward?: TaskReward;
    error?: string;
}
