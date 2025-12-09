/**
 * 📢 全服广播服务
 *
 * 功能：
 * 1. 超级大奖广播
 * 2. Jackpot广播
 * 3. 跨服务器通知
 */

import { HttpClient } from 'tsrpc';

export interface BroadcastMessage {
    type: 'super_prize' | 'jackpot';
    userId: string;
    username: string;
    goldReward: number;
    ticketReward: number;
    message: string;
    timestamp: number;
}

export class BroadcastService {
    private static readonly MATCH_SERVER_URL = process.env.MATCH_URL || 'http://127.0.0.1:3001';
    private static broadcastHistory: BroadcastMessage[] = [];
    private static readonly MAX_HISTORY = 100; // 保留最近100条广播

    /**
     * 广播大奖消息
     */
    static async broadcastBigPrize(message: BroadcastMessage): Promise<boolean> {
        try {
            // 1. 添加到历史记录
            this.broadcastHistory.unshift(message);
            if (this.broadcastHistory.length > this.MAX_HISTORY) {
                this.broadcastHistory.pop();
            }

            // 2. 控制台输出
            console.log(`
╔═══════════════════════════════════════════════╗
║  🎊🎊🎊  全服大奖通知  🎊🎊🎊                ║
╠═══════════════════════════════════════════════╣
║  玩家: ${message.username.padEnd(30)}      ║
║  奖励: ${message.goldReward} 金币 + ${message.ticketReward} 彩票${' '.repeat(20 - (message.goldReward.toString().length + message.ticketReward.toString().length))}║
║  类型: ${message.type === 'jackpot' ? '🏆 JACKPOT' : '💎 超级大奖'}${' '.repeat(25)}║
╚═══════════════════════════════════════════════╝
            `);

            // 3. TODO: 通过Match Server转发给所有Room Server
            // 这里可以实现跨服务器广播
            // await this.notifyMatchServer(message);

            return true;
        } catch (error) {
            console.error('[BroadcastService] 广播失败:', error);
            return false;
        }
    }

    /**
     * 获取广播历史
     */
    static getBroadcastHistory(limit: number = 10): BroadcastMessage[] {
        return this.broadcastHistory.slice(0, limit);
    }

    /**
     * 清空广播历史
     */
    static clearHistory(): void {
        this.broadcastHistory = [];
    }

    /**
     * 通知Match Server（可选实现）
     */
    private static async notifyMatchServer(message: BroadcastMessage): Promise<void> {
        // TODO: 实现通过Match Server转发消息给所有Room Server
        // 这需要在Match Server添加对应的广播接口
    }
}
