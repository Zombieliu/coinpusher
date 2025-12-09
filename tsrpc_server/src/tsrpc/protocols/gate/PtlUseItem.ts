import { ItemEffect } from '../../../server/gate/bll/ItemSystem';

export interface ReqUseItem {
    userId: string;
    itemId: string;
}

export interface ResUseItem {
    success: boolean;
    error?: string;
    effect?: ItemEffect;
    buffId?: string;
}
