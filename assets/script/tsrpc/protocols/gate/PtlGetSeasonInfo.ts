import { SeasonConfig, UserSeasonData, LevelReward } from '../../../server/gate/bll/SeasonSystem';

export interface ReqGetSeasonInfo {
    // 无参数
}

export interface ResGetSeasonInfo {
    currentSeason: SeasonConfig;
    userData: UserSeasonData;
    stats: {
        level: number;
        exp: number;
        expToNext: number;
        progress: number;
        hasPremiumPass: boolean;
        multiplier: number;
        totalClaimedRewards: number;
        daysRemaining: number;
    };
    claimableRewards: {
        free: number[];
        premium: number[];
    };
    allRewards: LevelReward[];
}
