import { ApiCall } from "tsrpc";
import { ReqCollectWithReward, ResCollectWithReward } from "../../../../tsrpc/protocols/gate/internal/PtlCollectWithReward";
import { UserDB } from "../../data/UserDB";
import { TransactionLog } from "../../data/TransactionLog";
import { RewardSystem, RewardType } from "../../bll/RewardSystem";
import { BroadcastService } from "../../bll/BroadcastService";

/**
 * 带奖励的金币收集API（内部接口）
 *
 * 功能：
 * 1. 基础金币收集
 * 2. 奖励触发（小奖/大奖/超级大奖/Jackpot）
 * 3. 彩票发放
 */
export async function ApiCollectWithReward(call: ApiCall<ReqCollectWithReward, ResCollectWithReward>) {
    try {
        const { transactionId, userId, baseAmount } = call.req;

        // 1. 幂等性检查
        const existingTx = await TransactionLog.getTransaction(transactionId);
        if (existingTx) {
            console.log(`[CollectWithReward] 交易已存在: ${transactionId}`);
            // 返回之前的结果
            call.succ({
                success: true,
                baseReward: baseAmount,
                bonusReward: 0,
                totalReward: baseAmount,
                tickets: 0,
                rewardType: 'none',
                rewardMessage: '已处理',
                jackpotProgress: 0,
                shouldBroadcast: false
            });
            return;
        }

        // 2. 计算奖励
        const rewardResult = await RewardSystem.calculateReward(userId);

        // 3. 发放基础金币
        const user = await UserDB.getUserById(userId);
        if (!user) {
            call.error("用户不存在");
            return;
        }

        const totalGold = baseAmount + rewardResult.goldReward;
        await UserDB.updateUser(userId, {
            gold: user.gold + totalGold,
            totalRewards: (user.totalRewards || 0) + rewardResult.goldReward,
            lastRewardTime: rewardResult.goldReward > 0 ? Date.now() : user.lastRewardTime
        });

        // 4. 发放奖励（金币已在上面发放，这里只发放彩票）
        if (rewardResult.ticketReward > 0) {
            await UserDB.addTickets(userId, rewardResult.ticketReward);
        }

        // 5. 记录交易
        await TransactionLog.recordTransaction({
            userId,
            transactionId,
            type: 'add',
            amount: totalGold,
            reason: `collect_coins_${rewardResult.type}`,
            success: true,
            balance: user.gold + totalGold
        });

        // 6. 返回结果
        call.succ({
            success: true,
            baseReward: baseAmount,
            bonusReward: rewardResult.goldReward,
            totalReward: totalGold,
            tickets: rewardResult.ticketReward,
            rewardType: rewardResult.type,
            rewardMessage: rewardResult.message,
            jackpotProgress: rewardResult.jackpotProgress,
            shouldBroadcast: rewardResult.shouldBroadcast
        });

        // 7. 日志
        if (rewardResult.type !== RewardType.None) {
            console.log(`[CollectWithReward] 用户 ${userId} 触发 ${rewardResult.type}！奖励：${rewardResult.goldReward} 金币 + ${rewardResult.ticketReward} 彩票`);
        }

        // 8. 全服广播（超级大奖和Jackpot）
        if (rewardResult.shouldBroadcast) {
            await BroadcastService.broadcastBigPrize({
                type: rewardResult.type === RewardType.Jackpot ? 'jackpot' : 'super_prize',
                userId,
                username: user.username,
                goldReward: rewardResult.goldReward,
                ticketReward: rewardResult.ticketReward,
                message: rewardResult.message,
                timestamp: Date.now()
            });
        }

    } catch (error) {
        console.error('[ApiCollectWithReward] Error:', error);
        call.error("收集金币失败");
    }
}
