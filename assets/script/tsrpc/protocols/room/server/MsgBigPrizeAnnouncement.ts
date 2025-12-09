import { BaseMessage } from '../../base';

/**
 * 大奖全服广播消息
 */
export interface MsgBigPrizeAnnouncement extends BaseMessage {
    userId: string;
    username: string;
    rewardType: 'super' | 'jackpot';  // 超级大奖或Jackpot
    goldReward: number;
    ticketReward: number;
    message: string;
    timestamp: number;
}
