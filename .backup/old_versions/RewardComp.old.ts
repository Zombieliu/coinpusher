/**
 * @file RewardComp.ts
 * @description 奖励系统组件
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 处理金币奖励和链上同步：
 * - 收集金币奖励
 * - 批量同步到链上（避免频繁交易）
 * - 查询链上金币余额
 * - 订阅链上金币变化
 */

import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { SuiManager } from "../../blockchain/SuiManager";
import { CoinModelComp } from "../model/CoinModelComp";
import { GameConfig } from "../model/GameConfig";

export class RewardComp extends ecs.Comp {
    // ========== 链上同步配置 ==========
    /** 待同步到链上的金币变化（累积） */
    private _pendingGoldChange: number = 0;

    /** 上次同步到链的时间戳 */
    private _lastSyncTime: number = 0;

    /** 同步间隔（毫秒），避免频繁交易 */
    private readonly SYNC_INTERVAL_MS = 5000; // 5秒

    /** 最小同步金币数，低于此值不同步 */
    private readonly MIN_SYNC_AMOUNT = 10;

    /** 金币订阅取消函数 */
    private _unsubscribe: (() => void) | null = null;

    // ========== 生命周期 ==========

    onInit() {
        console.log("[RewardComp] Reward system initialized");

        // 监听金币收集事件
        oops.message.on(GameConfig.EVENT_LIST.COIN_COLLECTED, this._onCoinCollected, this);

        // 启动链上金币订阅
        this._startGoldSubscription();
    }

    // ========== 金币收集 ==========

    /** 金币收集事件处理 */
    private async _onCoinCollected(coinValue: number) {
        await this.collectCoin(coinValue);
    }

    /** 收集金币 */
    async collectCoin(coinValue: number) {
        console.log(`[RewardComp] Collected coin worth ${coinValue}`);

        // 累积待同步的金币
        this._pendingGoldChange += coinValue;

        // 立即更新本地显示
        const coinModel = this.entity.get(CoinModelComp);
        if (coinModel) {
            coinModel.totalGold += coinValue;

            // 触发 UI 更新事件
            oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, coinModel.totalGold);
        }

        // 检查是否需要同步到链
        this._checkSyncToChain();
    }

    // ========== 链上同步 ==========

    /** 检查是否需要同步到链 */
    private async _checkSyncToChain() {
        const now = Date.now();

        // 条件检查：
        // 1. 距离上次同步时间必须超过间隔
        // 2. 待同步金币数必须达到最小值
        if (now - this._lastSyncTime < this.SYNC_INTERVAL_MS) {
            return; // 时间间隔不够
        }

        if (Math.abs(this._pendingGoldChange) < this.MIN_SYNC_AMOUNT) {
            return; // 金币数量不够
        }

        // 满足条件，执行同步
        await this._syncToChain();
    }

    /** 同步金币变化到链上 */
    private async _syncToChain() {
        const goldChange = this._pendingGoldChange;
        if (goldChange === 0) return;

        console.log(`[RewardComp] Syncing ${goldChange} gold to chain...`);

        const suiManager = SuiManager.instance;
        if (!suiManager) {
            console.error('[RewardComp] SuiManager not available');
            return;
        }

        try {
            // 调用链上增加/减少金币的方法
            if (goldChange > 0) {
                await suiManager.increaseGold(goldChange);
            } else {
                await suiManager.decreaseGold(Math.abs(goldChange));
            }

            // 同步成功，清空待同步金币
            this._pendingGoldChange = 0;
            this._lastSyncTime = Date.now();

            console.log(`[RewardComp] ✅ Synced ${goldChange} gold to chain successfully`);

            // 播放成功提示音
            oops.audio.playEffect('sync_success');
        } catch (error) {
            console.error('[RewardComp] ❌ Failed to sync gold to chain:', error);

            // 同步失败，保留待同步金币，下次重试
            // 可以选择显示错误提示
            oops.gui.toast(`链上同步失败: ${error}`);
        }
    }

    /** 强制同步到链（游戏结束时调用） */
    async forceSyncToChain() {
        if (this._pendingGoldChange === 0) return;

        console.log('[RewardComp] Force syncing to chain...');
        await this._syncToChain();
    }

    // ========== 链上查询 ==========

    /** 查询链上金币 */
    async queryChainGold(): Promise<number | null> {
        const suiManager = SuiManager.instance;
        if (!suiManager) {
            console.warn('[RewardComp] SuiManager not available');
            return null;
        }

        console.log('[RewardComp] Querying gold from chain...');

        try {
            const gold = await suiManager.queryGoldFromChain();

            // 更新本地数据
            if (gold !== null) {
                const coinModel = this.entity.get(CoinModelComp);
                if (coinModel) {
                    coinModel.totalGold = gold;
                }

                // 触发 UI 更新
                oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, gold);

                console.log(`[RewardComp] ✅ Chain gold: ${gold}`);
            }

            return gold;
        } catch (error) {
            console.error('[RewardComp] ❌ Failed to query gold from chain:', error);
            return null;
        }
    }

    /** 启动链上金币实时订阅 */
    private _startGoldSubscription() {
        const suiManager = SuiManager.instance;
        if (!suiManager) {
            console.warn('[RewardComp] SuiManager not available for subscription');
            return;
        }

        // 订阅链上金币变化
        this._unsubscribe = suiManager.subscribeToGoldChanges((newValue: number) => {
            console.log(`[RewardComp] 📡 Gold changed from chain subscription: ${newValue}`);

            // 更新本地数据
            const coinModel = this.entity.get(CoinModelComp);
            if (coinModel) {
                coinModel.totalGold = newValue;
            }

            // 触发 UI 更新
            oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, newValue);
        });

        console.log('[RewardComp] Gold subscription started');
    }

    /** 取消链上金币订阅 */
    private _stopGoldSubscription() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
            console.log('[RewardComp] Gold subscription stopped');
        }
    }

    // ========== 清理 ==========

    onDestroy() {
        console.log('[RewardComp] Component destroyed');

        // 取消事件监听
        oops.message.off(GameConfig.EVENT_LIST.COIN_COLLECTED, this._onCoinCollected, this);

        // 取消链上订阅
        this._stopGoldSubscription();

        // 强制同步剩余金币
        this.forceSyncToChain();
    }
}
