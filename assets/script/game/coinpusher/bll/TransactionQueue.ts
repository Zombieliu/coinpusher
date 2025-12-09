/**
 * @file TransactionQueue.ts
 * @description 区块链交易队列管理器
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 生产级交易队列系统，提供：
 * - 交易队列管理
 * - 自动重试（指数退避）
 * - 并发控制
 * - 状态跟踪
 * - 本地持久化
 * - 错误处理
 *
 * @features
 * - ✅ 交易排队和优先级
 * - ✅ 指数退避重试策略
 * - ✅ 并发锁（同时只处理一个交易）
 * - ✅ 本地持久化（断电不丢失）
 * - ✅ 详细的状态跟踪
 * - ✅ 事件回调系统
 */

import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import {
    Transaction,
    TransactionStatus,
    TransactionType,
    TransactionError,
    TransactionErrorType,
    TransactionQueueConfig,
    TransactionQueueStats,
    TransactionCallback
} from "./TransactionTypes";

/** 默认队列配置 */
const DEFAULT_CONFIG: TransactionQueueConfig = {
    maxRetries: 5,                      // 最多重试 5 次
    initialRetryDelay: 1000,            // 初始延迟 1 秒
    retryDelayMultiplier: 2,            // 每次延迟翻倍
    maxRetryDelay: 30000,               // 最大延迟 30 秒
    transactionTimeout: 60000,          // 交易超时 60 秒
    enablePersistence: true,            // 启用持久化
    storageKey: "transaction_queue",    // 存储键
    maxQueueSize: 1000,                 // 最大队列长度
};

/**
 * 交易队列管理器
 *
 * @class TransactionQueue
 *
 * @example
 * ```typescript
 * const queue = new TransactionQueue();
 *
 * // 添加交易
 * const txId = queue.enqueue({
 *     type: TransactionType.INCREASE_GOLD,
 *     amount: 100
 * });
 *
 * // 监听事件
 * queue.on('success', (tx) => {
 *     console.log('交易成功:', tx);
 * });
 *
 * // 开始处理
 * await queue.processQueue();
 * ```
 */
export class TransactionQueue {
    /** 交易队列 */
    private _queue: Transaction[] = [];

    /** 是否正在处理交易 */
    private _processing: boolean = false;

    /** 处理锁（确保同时只有一个交易在处理） */
    private _processingLock: boolean = false;

    /** 配置 */
    private _config: TransactionQueueConfig;

    /** 事件回调 */
    private _callbacks: Map<string, TransactionCallback[]> = new Map();

    /** 统计信息 */
    private _stats: TransactionQueueStats = {
        total: 0,
        pending: 0,
        processing: 0,
        success: 0,
        failed: 0,
        permanentlyFailed: 0,
        averageProcessTime: 0,
        successRate: 0
    };

    /** 处理时间记录（用于计算平均值） */
    private _processTimes: number[] = [];

    // ========== 构造和初始化 ==========

    constructor(config?: Partial<TransactionQueueConfig>) {
        this._config = { ...DEFAULT_CONFIG, ...config };

        console.log('[TransactionQueue] Initialized with config:', this._config);

        // 从本地存储加载队列
        if (this._config.enablePersistence) {
            this._loadFromStorage();
        }
    }

    // ========== 队列操作 ==========

    /**
     * 添加交易到队列
     *
     * @param params 交易参数
     * @returns 交易 ID
     */
    enqueue(params: {
        type: TransactionType;
        amount: number;
        priority?: number;
        metadata?: Record<string, any>;
    }): string {
        // 检查队列是否已满
        if (this._queue.length >= this._config.maxQueueSize) {
            console.error('[TransactionQueue] Queue is full, cannot add more transactions');
            throw new Error('Transaction queue is full');
        }

        // 生成交易 ID
        const txId = this._generateTransactionId();

        // 创建交易对象
        const transaction: Transaction = {
            id: txId,
            type: params.type,
            amount: params.amount,
            status: TransactionStatus.PENDING,
            retryCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            priority: params.priority || 0,
            metadata: params.metadata
        };

        // 添加到队列
        this._queue.push(transaction);

        // 按优先级排序（高优先级在前）
        this._queue.sort((a, b) => b.priority - a.priority);

        // 更新统计
        this._stats.total++;
        this._stats.pending++;

        console.log(`[TransactionQueue] ✅ Enqueued transaction ${txId}:`, transaction);

        // 触发事件
        this._emit('enqueue', transaction);

        // 持久化
        if (this._config.enablePersistence) {
            this._saveToStorage();
        }

        // 自动开始处理
        this.processQueue();

        return txId;
    }

    /**
     * 处理队列中的交易
     */
    async processQueue(): Promise<void> {
        // 如果已经在处理，跳过
        if (this._processing || this._processingLock) {
            return;
        }

        this._processing = true;

        try {
            while (true) {
                // 获取下一个待处理的交易
                const tx = this._getNextTransaction();

                if (!tx) {
                    // 没有待处理的交易
                    break;
                }

                // 处理交易
                await this._processTransaction(tx);
            }
        } finally {
            this._processing = false;
        }
    }

    /**
     * 获取下一个待处理的交易
     */
    private _getNextTransaction(): Transaction | null {
        const now = Date.now();

        // 查找第一个可以处理的交易
        for (const tx of this._queue) {
            // 跳过已经处理中、成功或永久失败的交易
            if (tx.status === TransactionStatus.PROCESSING ||
                tx.status === TransactionStatus.SUCCESS ||
                tx.status === TransactionStatus.PERMANENTLY_FAILED) {
                continue;
            }

            // 如果是失败的交易，检查是否到了重试时间
            if (tx.status === TransactionStatus.FAILED) {
                if (tx.nextRetryAt && now < tx.nextRetryAt) {
                    continue; // 还没到重试时间
                }
            }

            return tx;
        }

        return null;
    }

    /**
     * 处理单个交易
     */
    private async _processTransaction(tx: Transaction): Promise<void> {
        // 获取处理锁
        if (this._processingLock) {
            console.warn('[TransactionQueue] Processing lock is held, skipping transaction');
            return;
        }

        this._processingLock = true;
        const startTime = Date.now();

        try {
            console.log(`[TransactionQueue] 🔄 Processing transaction ${tx.id}...`);

            // 更新状态为处理中
            this._updateTransactionStatus(tx, TransactionStatus.PROCESSING);

            // 根据交易类型调用相应的处理函数
            const success = await this._executeTransaction(tx);

            if (success) {
                // 交易成功
                this._updateTransactionStatus(tx, TransactionStatus.SUCCESS);

                const processTime = Date.now() - startTime;
                this._processTimes.push(processTime);

                console.log(`[TransactionQueue] ✅ Transaction ${tx.id} succeeded in ${processTime}ms`);

                // 触发成功事件
                this._emit('success', tx);
            } else {
                // 交易失败
                this._handleTransactionFailure(tx, {
                    type: TransactionErrorType.UNKNOWN,
                    message: 'Transaction execution returned false',
                    retryable: true
                });
            }
        } catch (error) {
            console.error(`[TransactionQueue] ❌ Transaction ${tx.id} failed:`, error);

            // 解析错误
            const txError = this._parseError(error);

            // 处理失败
            this._handleTransactionFailure(tx, txError);
        } finally {
            // 释放锁
            this._processingLock = false;

            // 持久化
            if (this._config.enablePersistence) {
                this._saveToStorage();
            }
        }
    }

    /**
     * 执行交易（调用区块链）
     */
    private async _executeTransaction(tx: Transaction): Promise<boolean> {
        // 导入 SuiManager
        const { SuiManager } = await import('../../blockchain/SuiManager');
        const suiManager = SuiManager.instance;

        if (!suiManager) {
            throw new Error('SuiManager not available');
        }

        // 设置超时
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error('Transaction timeout'));
            }, this._config.transactionTimeout);
        });

        // 根据交易类型执行
        const executionPromise = (async () => {
            switch (tx.type) {
                case TransactionType.INCREASE_GOLD:
                    return await suiManager.increaseGold(tx.amount);

                case TransactionType.DECREASE_GOLD:
                    return await suiManager.decreaseGold(tx.amount);

                case TransactionType.CREATE_SESSION:
                    await suiManager.createOnchainSession();
                    return true;

                default:
                    throw new Error(`Unknown transaction type: ${tx.type}`);
            }
        })();

        // 竞速：执行 vs 超时
        return await Promise.race([executionPromise, timeoutPromise]);
    }

    /**
     * 处理交易失败
     */
    private _handleTransactionFailure(tx: Transaction, error: TransactionError): void {
        tx.error = error;
        tx.retryCount++;

        console.warn(`[TransactionQueue] Transaction ${tx.id} failed (retry ${tx.retryCount}/${this._config.maxRetries}):`, error);

        // 检查是否超过最大重试次数
        if (tx.retryCount >= this._config.maxRetries) {
            // 永久失败
            this._updateTransactionStatus(tx, TransactionStatus.PERMANENTLY_FAILED);

            console.error(`[TransactionQueue] ❌ Transaction ${tx.id} permanently failed after ${tx.retryCount} retries`);

            // 触发永久失败事件
            this._emit('permanently_failed', tx);

            return;
        }

        // 检查错误是否可重试
        if (!error.retryable) {
            // 不可重试的错误，直接标记为永久失败
            this._updateTransactionStatus(tx, TransactionStatus.PERMANENTLY_FAILED);

            console.error(`[TransactionQueue] ❌ Transaction ${tx.id} permanently failed (non-retryable error):`, error);

            // 触发永久失败事件
            this._emit('permanently_failed', tx);

            return;
        }

        // 可重试，计算下次重试时间（指数退避）
        const retryDelay = this._calculateRetryDelay(tx.retryCount);
        tx.nextRetryAt = Date.now() + retryDelay;

        this._updateTransactionStatus(tx, TransactionStatus.FAILED);

        console.log(`[TransactionQueue] ⏰ Will retry transaction ${tx.id} in ${retryDelay}ms`);

        // 触发失败事件
        this._emit('failed', tx);

        // 安排重试
        setTimeout(() => {
            this.processQueue();
        }, retryDelay);
    }

    /**
     * 计算重试延迟（指数退避）
     */
    private _calculateRetryDelay(retryCount: number): number {
        const delay = this._config.initialRetryDelay *
            Math.pow(this._config.retryDelayMultiplier, retryCount - 1);

        // 限制最大延迟
        return Math.min(delay, this._config.maxRetryDelay);
    }

    /**
     * 解析错误对象
     */
    private _parseError(error: any): TransactionError {
        const message = error?.message || String(error);

        // 根据错误消息判断错误类型
        let type = TransactionErrorType.UNKNOWN;
        let retryable = true;

        if (message.includes('timeout') || message.includes('TIMEOUT')) {
            type = TransactionErrorType.TIMEOUT;
            retryable = true;
        } else if (message.includes('network') || message.includes('NETWORK')) {
            type = TransactionErrorType.NETWORK_ERROR;
            retryable = true;
        } else if (message.includes('insufficient balance') || message.includes('INSUFFICIENT_BALANCE')) {
            type = TransactionErrorType.INSUFFICIENT_BALANCE;
            retryable = false;
        } else if (message.includes('insufficient gas') || message.includes('GAS')) {
            type = TransactionErrorType.INSUFFICIENT_GAS;
            retryable = false;
        } else if (message.includes('nonce') || message.includes('NONCE')) {
            type = TransactionErrorType.NONCE_ERROR;
            retryable = true;
        } else if (message.includes('contract') || message.includes('CONTRACT')) {
            type = TransactionErrorType.CONTRACT_ERROR;
            retryable = false;
        }

        return {
            type,
            message,
            retryable,
            originalError: error
        };
    }

    // ========== 状态管理 ==========

    /**
     * 更新交易状态
     */
    private _updateTransactionStatus(tx: Transaction, status: TransactionStatus): void {
        const oldStatus = tx.status;
        tx.status = status;
        tx.updatedAt = Date.now();

        // 更新统计
        this._updateStats(oldStatus, status);

        console.log(`[TransactionQueue] Transaction ${tx.id} status: ${oldStatus} → ${status}`);
    }

    /**
     * 更新统计信息
     */
    private _updateStats(oldStatus: TransactionStatus, newStatus: TransactionStatus): void {
        // 减少旧状态计数
        switch (oldStatus) {
            case TransactionStatus.PENDING:
                this._stats.pending--;
                break;
            case TransactionStatus.PROCESSING:
                this._stats.processing--;
                break;
            case TransactionStatus.FAILED:
                this._stats.failed--;
                break;
        }

        // 增加新状态计数
        switch (newStatus) {
            case TransactionStatus.PENDING:
                this._stats.pending++;
                break;
            case TransactionStatus.PROCESSING:
                this._stats.processing++;
                break;
            case TransactionStatus.SUCCESS:
                this._stats.success++;
                break;
            case TransactionStatus.FAILED:
                this._stats.failed++;
                break;
            case TransactionStatus.PERMANENTLY_FAILED:
                this._stats.permanentlyFailed++;
                break;
        }

        // 计算成功率
        const total = this._stats.success + this._stats.failed + this._stats.permanentlyFailed;
        this._stats.successRate = total > 0 ? (this._stats.success / total) * 100 : 0;

        // 计算平均处理时间
        if (this._processTimes.length > 0) {
            const sum = this._processTimes.reduce((a, b) => a + b, 0);
            this._stats.averageProcessTime = sum / this._processTimes.length;
        }
    }

    /**
     * 获取交易状态
     */
    getTransactionStatus(txId: string): TransactionStatus | null {
        const tx = this._queue.find(t => t.id === txId);
        return tx ? tx.status : null;
    }

    /**
     * 获取交易对象
     */
    getTransaction(txId: string): Transaction | null {
        return this._queue.find(t => t.id === txId) || null;
    }

    /**
     * 获取所有交易
     */
    getAllTransactions(): Transaction[] {
        return [...this._queue];
    }

    /**
     * 获取统计信息
     */
    getStats(): TransactionQueueStats {
        return { ...this._stats };
    }

    // ========== 队列管理 ==========

    /**
     * 清理已完成的交易
     */
    clearCompleted(): void {
        const before = this._queue.length;

        this._queue = this._queue.filter(tx =>
            tx.status !== TransactionStatus.SUCCESS
        );

        const removed = before - this._queue.length;

        console.log(`[TransactionQueue] Cleared ${removed} completed transactions`);

        if (this._config.enablePersistence) {
            this._saveToStorage();
        }
    }

    /**
     * 清理永久失败的交易
     */
    clearPermanentlyFailed(): void {
        const before = this._queue.length;

        this._queue = this._queue.filter(tx =>
            tx.status !== TransactionStatus.PERMANENTLY_FAILED
        );

        const removed = before - this._queue.length;

        console.log(`[TransactionQueue] Cleared ${removed} permanently failed transactions`);

        if (this._config.enablePersistence) {
            this._saveToStorage();
        }
    }

    /**
     * 清空整个队列
     */
    clear(): void {
        this._queue = [];
        this._stats = {
            total: 0,
            pending: 0,
            processing: 0,
            success: 0,
            failed: 0,
            permanentlyFailed: 0,
            averageProcessTime: 0,
            successRate: 0
        };

        console.log('[TransactionQueue] Queue cleared');

        if (this._config.enablePersistence) {
            this._saveToStorage();
        }
    }

    /**
     * 重试所有失败的交易
     */
    retryAllFailed(): void {
        let count = 0;

        for (const tx of this._queue) {
            if (tx.status === TransactionStatus.FAILED) {
                tx.nextRetryAt = Date.now(); // 立即重试
                count++;
            }
        }

        console.log(`[TransactionQueue] Retrying ${count} failed transactions`);

        this.processQueue();
    }

    // ========== 事件系统 ==========

    /**
     * 注册事件监听
     */
    on(event: string, callback: TransactionCallback): void {
        if (!this._callbacks.has(event)) {
            this._callbacks.set(event, []);
        }

        this._callbacks.get(event)!.push(callback);
    }

    /**
     * 取消事件监听
     */
    off(event: string, callback: TransactionCallback): void {
        if (!this._callbacks.has(event)) return;

        const callbacks = this._callbacks.get(event)!;
        const index = callbacks.indexOf(callback);

        if (index >= 0) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * 触发事件
     */
    private _emit(event: string, tx: Transaction): void {
        if (!this._callbacks.has(event)) return;

        const callbacks = this._callbacks.get(event)!;

        for (const callback of callbacks) {
            try {
                callback(tx);
            } catch (error) {
                console.error(`[TransactionQueue] Error in event callback for ${event}:`, error);
            }
        }
    }

    // ========== 持久化 ==========

    /**
     * 保存到本地存储
     */
    private _saveToStorage(): void {
        try {
            const data = {
                queue: this._queue,
                stats: this._stats,
                timestamp: Date.now()
            };

            oops.storage.set(this._config.storageKey, JSON.stringify(data));

            console.log('[TransactionQueue] Saved to storage');
        } catch (error) {
            console.error('[TransactionQueue] Failed to save to storage:', error);
        }
    }

    /**
     * 从本地存储加载
     */
    private _loadFromStorage(): void {
        try {
            const data = oops.storage.get(this._config.storageKey);

            if (!data) {
                console.log('[TransactionQueue] No saved data found');
                return;
            }

            const parsed = JSON.parse(data);

            this._queue = parsed.queue || [];
            this._stats = parsed.stats || this._stats;

            console.log(`[TransactionQueue] Loaded ${this._queue.length} transactions from storage`);

            // 恢复处理
            this.processQueue();
        } catch (error) {
            console.error('[TransactionQueue] Failed to load from storage:', error);
        }
    }

    // ========== 工具方法 ==========

    /**
     * 生成交易 ID
     */
    private _generateTransactionId(): string {
        return `tx_${Date.now()}_${oops.random.getRandomFloat(0, 1).toString(36).substr(2, 9)}`;
    }
}
