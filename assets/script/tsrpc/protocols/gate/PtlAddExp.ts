import { LevelReward } from '../../../server/gate/bll/LevelSystem';

export interface ReqAddExp {
    userId: string;
    exp: number;
}

export interface ResAddExp {
    success: boolean;
    leveledUp: boolean;
    oldLevel?: number;
    newLevel?: number;
    rewards?: LevelReward[];
    error?: string;
}
