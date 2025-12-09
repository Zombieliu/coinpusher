/**
 * @file TransactionTypes.ts
 * @description 区块链交易类型定义
 *
 * @module coinpusher/bll
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 定义交易队列使用的类型和接口：
 * - Transaction: 交易对象
 * - TransactionStatus: 交易状态枚举
 * - TransactionType: 交易类型枚举
 * - TransactionError: 交易错误信息
 */

/** 交易状态 */
export enum TransactionStatus {
    /** 待处理 - 已加入队列但未开始 */
    PENDING = 'pending',

    /** 处理中 - 正在提交到区块链 */
    PROCESSING = 'processing',

    /** 成功 - 交易已确认 */
    SUCCESS = 'success',

    /** 失败 - 交易失败（可能重试） */
    FAILED = 'failed',

    /** 永久失败 - 超过最大重试次数，不再重试 */
    PERMANENTLY_FAILED = 'permanently_failed'
}

/** 交易类型 */
export enum TransactionType {
    /** 增加金币 */
    INCREASE_GOLD = 'increase_gold',

    /** 减少金币 */
    DECREASE_GOLD = 'decrease_gold',

    /** 创建 Session Key */
    CREATE_SESSION = 'create_session',

    /** 其他自定义交易 */
    CUSTOM = 'custom'
}

/** 交易错误类型 */
export enum TransactionErrorType {
    /** 网络错误 - 可重试 */
    NETWORK_ERROR = 'network_error',

    /** 余额不足 - 不可重试 */
    INSUFFICIENT_BALANCE = 'insufficient_balance',

    /** Gas 不足 - 不可重试 */
    INSUFFICIENT_GAS = 'insufficient_gas',

    /** Nonce 错误 - 可重试 */
    NONCE_ERROR = 'nonce_error',

    /** 交易超时 - 可重试 */
    TIMEOUT = 'timeout',

    /** 合约执行失败 - 不可重试 */
    CONTRACT_ERROR = 'contract_error',

    /** 未知错误 - 可重试 */
    UNKNOWN = 'unknown'
}

/** 交易错误信息 */
export interface TransactionError {
    /** 错误类型 */
    type: TransactionErrorType;

    /** 错误消息 */
    message: string;

    /** 是否可重试 */
    retryable: boolean;

    /** 原始错误对象 */
    originalError?: any;
}

/** 交易对象 */
export interface Transaction {
    /** 交易唯一 ID */
    id: string;

    /** 交易类型 */
    type: TransactionType;

    /** 交易参数（金币数量等） */
    amount: number;

    /** 交易状态 */
    status: TransactionStatus;

    /** 重试次数 */
    retryCount: number;

    /** 创建时间戳 */
    createdAt: number;

    /** 最后更新时间戳 */
    updatedAt: number;

    /** 下次重试时间戳（如果失败） */
    nextRetryAt?: number;

    /** 错误信息（如果失败） */
    error?: TransactionError;

    /** 区块链交易哈希（如果已提交） */
    txHash?: string;

    /** 优先级（数字越大优先级越高） */
    priority: number;

    /** 自定义元数据 */
    metadata?: Record<string, any>;
}

/** 交易队列配置 */
export interface TransactionQueueConfig {
    /** 最大重试次数 */
    maxRetries: number;

    /** 初始重试延迟（毫秒） */
    initialRetryDelay: number;

    /** 重试延迟倍数（指数退避） */
    retryDelayMultiplier: number;

    /** 最大重试延迟（毫秒） */
    maxRetryDelay: number;

    /** 交易超时时间（毫秒） */
    transactionTimeout: number;

    /** 是否启用本地持久化 */
    enablePersistence: boolean;

    /** 本地存储键名 */
    storageKey: string;

    /** 队列最大长度（防止内存溢出） */
    maxQueueSize: number;
}

/** 交易队列统计信息 */
export interface TransactionQueueStats {
    /** 总交易数 */
    total: number;

    /** 待处理数 */
    pending: number;

    /** 处理中数 */
    processing: number;

    /** 成功数 */
    success: number;

    /** 失败数 */
    failed: number;

    /** 永久失败数 */
    permanentlyFailed: number;

    /** 平均处理时间（毫秒） */
    averageProcessTime: number;

    /** 成功率（百分比） */
    successRate: number;
}

/** 交易回调函数类型 */
export type TransactionCallback = (tx: Transaction) => void;

/** 交易过滤器函数类型 */
export type TransactionFilter = (tx: Transaction) => boolean;
