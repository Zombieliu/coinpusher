export enum AchievementStatus {
    Locked = 'locked',
    InProgress = 'in_progress',
    Completed = 'completed',
    Claimed = 'claimed'
}

export interface UserAchievement {
    achievementId?: string;
    title?: string;
    progress?: number;
    target?: number;
    status?: AchievementStatus;
    updatedAt?: number;
}
