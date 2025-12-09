import { BuffData, BuffEffect } from '../../../server/gate/bll/BuffSystem';

export interface ReqGetBuffs {
    userId: string;
}

export interface ResGetBuffs {
    activeBuffs: BuffData[];
    effects: BuffEffect[];
    timers: { [buffType: string]: number };  // buffType -> 剩余秒数
}
