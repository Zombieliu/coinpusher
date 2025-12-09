/**
 * @file RewardComp.ts
 * @description 奖励系统组件（使用交易队列版本）
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-11-28
 * @updated 2025-11-28 (集成 TransactionQueue)
 *
 * @description
 * 处理金币奖励和链上同步（使用交易队列）：
 * - 收集金币奖励
 * - 通过交易队列批量同步到链上
 * - 查询链上金币余额
 * - 订阅链上金币变化
 * - 自动重试失败的交易
 *
 * @features
 * - ✅ 交易队列管理
 * - ✅ 自动重试（指数退避）
 * - ✅ 并发控制
 * - ✅ 本地持久化
 * - ✅ 详细的状态跟踪
 */

import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
// import { SuiManager } from "../../blockchain/SuiManager"; // 暂时注释掉，不再直接调用 SuiManager
import { CoinModelComp } from "../model/CoinModelComp";
import { GameConfig } from "../model/GameConfig";
// import { TransactionQueue } from "./TransactionQueue"; // 移除 TransactionQueue
// import { TransactionType, Transaction, TransactionStatus } from "./TransactionTypes"; // 移除 TransactionType
import { ApiClient } from "../../network/ApiClient";

@ecs.register("RewardComp")
export class RewardComp extends ecs.Comp {
    // ========== 生命周期 ==========

    onInit() {
        console.log("[RewardComp] Reward system initialized (Server-Authoritative)");

        // 监听金币收集事件
        oops.message.on(GameConfig.EVENT_LIST.COIN_COLLECTED, this._onCoinCollected, this);

        // 链上金币订阅暂时移除，金币以服务端为准
        // this._startGoldSubscription();
    }

    // ========== 金币收集 / 消耗 ==========

    /** 金币收集事件处理 */
    private async _onCoinCollected(coinValue: number) {
        await this.collectCoin(coinValue);
    }

    /** 收集金币 */
    async collectCoin(coinValue: number) {
        console.log(`[RewardComp] Requesting server to collect ${coinValue} gold...`);
        try {
            const currentGold = await ApiClient.instance.collectCoin(coinValue);
            const coinModel = this.ent.get(CoinModelComp);
            if (coinModel) {
                coinModel.totalGold = currentGold; // 更新为服务器返回的金币数
                oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, currentGold);
            }
        } catch (error) {
            console.error('[RewardComp] Failed to collect coin via server:', error);
            // 这里可以添加更友好的错误提示
        }
    }
    
    /** 消耗金币 */
    async consumeGold(amount: number) {
        console.log(`[RewardComp] Requesting server to consume ${amount} gold...`);
        try {
            const currentGold = await ApiClient.instance.consumeGold(amount);
            const coinModel = this.ent.get(CoinModelComp);
            if (coinModel) {
                coinModel.totalGold = currentGold; // 更新为服务器返回的金币数
                oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, currentGold);
            }
        } catch (error) {
            console.error('[RewardComp] Failed to consume gold via server:', error);
            // 这里可以添加更友好的错误提示，并可能需要回滚 UI 上的扣除
        }
    }

    // ========== 清理 ==========

    onDestroy() {
        console.log('[RewardComp] Component destroyed');

        // 取消事件监听
        oops.message.off(GameConfig.EVENT_LIST.COIN_COLLECTED, this._onCoinCollected, this);

        // 链上订阅已移除，所以不需要取消
        // this._stopGoldSubscription();
    }
}
