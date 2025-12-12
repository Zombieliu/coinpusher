import { LevelData } from '../../../server/gate/bll/LevelSystem';

export interface ReqGetLevelInfo {
    userId: string;
}

export interface ResGetLevelInfo {
    levelData: LevelData;
}
