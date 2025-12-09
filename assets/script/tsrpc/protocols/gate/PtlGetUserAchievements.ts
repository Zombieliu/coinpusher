import { UserAchievement } from '../../../server/gate/bll/AchievementSystem';

export interface ReqGetUserAchievements {
    // 无参数
}

export interface ResGetUserAchievements {
    achievements: UserAchievement[];
    stats: {
        totalCompleted: number;
        totalCount: number;
        completionRate: number;
        unlockedTitles: string[];
    };
}
