/**
 * 🔒 Error Message Sanitization
 *
 * 防止错误信息泄露敏感信息:
 * 1. 隐藏内部路径和堆栈跟踪
 * 2. 不暴露数据库结构
 * 3. 统一错误响应格式
 * 4. 区分开发/生产环境错误详情
 *
 * 安全风险:
 * - 错误信息可能泄露服务器路径、数据库结构、代码逻辑
 * - 攻击者可利用详细错误信息进行针对性攻击
 */

export enum ErrorCode {
    // 通用错误
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    INVALID_REQUEST = 'INVALID_REQUEST',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // 认证错误
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    TWO_FACTOR_REQUIRED = '2FA_REQUIRED',

    // 资源错误
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    CONFLICT = 'CONFLICT',

    // 验证错误
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_PARAMETER = 'INVALID_PARAMETER',
    INVALID_PARAM = 'INVALID_PARAM',

    // 业务错误
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    OPERATION_FAILED = 'OPERATION_FAILED',
    BUSINESS_ERROR = 'BUSINESS_ERROR',
    DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
    DATABASE_ERROR = 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export interface SanitizedError {
    code: ErrorCode;
    message: string;          // 用户友好的错误信息
    timestamp: number;
    requestId?: string;       // 请求 ID (用于日志关联)
    details?: any;            // 开发环境才返回
}

export class ErrorSanitizer {
    private static readonly IS_PRODUCTION = process.env.NODE_ENV === 'production';
    private static readonly ENABLE_STACK_TRACE = process.env.ENABLE_ERROR_STACK_TRACE === 'true';

    /**
     * 🔒 净化错误信息
     * @param error 原始错误
     * @param requestId 请求 ID
     * @returns 安全的错误响应
     */
    static sanitize(error: any, requestId?: string): SanitizedError {
        // 如果是已知的业务错误，直接返回
        if (error.code && Object.values(ErrorCode).includes(error.code)) {
            return {
                code: error.code,
                message: error.message,
                timestamp: Date.now(),
                requestId,
                details: this.IS_PRODUCTION ? undefined : error.details
            };
        }

        // 数据库错误
        if (this.isDatabaseError(error)) {
            return this.sanitizeDatabaseError(error, requestId);
        }

        // 验证错误
        if (this.isValidationError(error)) {
            return this.sanitizeValidationError(error, requestId);
        }

        // 默认内部错误
        return this.sanitizeInternalError(error, requestId);
    }

    /**
     * 🔒 净化数据库错误
     */
    private static sanitizeDatabaseError(error: any, requestId?: string): SanitizedError {
        // 记录详细错误到日志
        console.error('[ErrorSanitizer] Database error:', {
            message: error.message,
            code: error.code,
            requestId
        });

        // 生产环境隐藏详细信息
        if (this.IS_PRODUCTION) {
            return {
                code: ErrorCode.INTERNAL_ERROR,
                message: 'A database error occurred. Please try again later.',
                timestamp: Date.now(),
                requestId
            };
        }

        // 开发环境返回部分信息 (不包含敏感路径)
        return {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'Database error',
            timestamp: Date.now(),
            requestId,
            details: {
                type: 'DatabaseError',
                code: error.code,
                // 移除敏感信息
                sanitizedMessage: this.removeSensitivePaths(error.message)
            }
        };
    }

    /**
     * 🔒 净化验证错误
     */
    private static sanitizeValidationError(error: any, requestId?: string): SanitizedError {
        return {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Validation failed',
            timestamp: Date.now(),
            requestId,
            details: this.IS_PRODUCTION ? undefined : {
                fields: error.fields || error.errors
            }
        };
    }

    /**
     * 🔒 净化内部错误
     */
    private static sanitizeInternalError(error: any, requestId?: string): SanitizedError {
        // 记录完整错误到日志
        console.error('[ErrorSanitizer] Internal error:', {
            message: error.message,
            stack: error.stack,
            requestId
        });

        // 生产环境返回通用错误
        if (this.IS_PRODUCTION) {
            return {
                code: ErrorCode.INTERNAL_ERROR,
                message: 'An internal error occurred. Please contact support if the problem persists.',
                timestamp: Date.now(),
                requestId
            };
        }

        // 开发环境返回详细信息
        return {
            code: ErrorCode.INTERNAL_ERROR,
            message: 'Internal server error',
            timestamp: Date.now(),
            requestId,
            details: {
                type: error.name || 'Error',
                message: this.removeSensitivePaths(error.message),
                stack: this.ENABLE_STACK_TRACE ? this.sanitizeStackTrace(error.stack) : undefined
            }
        };
    }

    /**
     * 🔒 移除错误信息中的敏感路径
     */
    private static removeSensitivePaths(message: string): string {
        if (!message) return '';

        return message
            // 移除文件系统路径
            .replace(/\/[a-zA-Z0-9_\-\/\.]+\/(?:src|node_modules|dist)/g, '[PATH]')
            // 移除用户目录路径
            .replace(/\/Users\/[a-zA-Z0-9_\-]+/g, '[HOME]')
            .replace(/C:\\Users\\[a-zA-Z0-9_\-]+/g, '[HOME]')
            // 移除 IP 地址
            .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
            // 移除端口号
            .replace(/:(\d{4,5})\b/g, ':[PORT]');
    }

    /**
     * 🔒 净化堆栈跟踪
     */
    private static sanitizeStackTrace(stack?: string): string[] {
        if (!stack) return [];

        return stack
            .split('\n')
            .slice(0, 5) // 只保留前5行
            .map(line => this.removeSensitivePaths(line))
            .filter(line => !line.includes('node_modules')); // 移除第三方库
    }

    /**
     * 🔒 判断是否为数据库错误
     */
    private static isDatabaseError(error: any): boolean {
        return (
            error.name === 'MongoError' ||
            error.name === 'MongoServerError' ||
            error.code?.toString().startsWith('E11') || // MongoDB duplicate key
            error.message?.includes('mongo') ||
            error.message?.includes('database')
        );
    }

    /**
     * 🔒 判断是否为验证错误
     */
    private static isValidationError(error: any): boolean {
        return (
            error.name === 'ValidationError' ||
            error.isJoi === true ||
            error.errors !== undefined
        );
    }

    /**
     * 🔒 创建标准错误
     */
    static createError(
        code: ErrorCode,
        message: string,
        details?: any
    ): SanitizedError {
        return {
            code,
            message,
            timestamp: Date.now(),
            details: this.IS_PRODUCTION ? undefined : details
        };
    }

    /**
     * 🔒 HTTP 状态码映射
     */
    static getHttpStatus(errorCode: ErrorCode): number {
        const statusMap: Record<ErrorCode, number> = {
            [ErrorCode.INTERNAL_ERROR]: 500,
            [ErrorCode.INVALID_REQUEST]: 400,
            [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
            [ErrorCode.UNAUTHORIZED]: 401,
            [ErrorCode.FORBIDDEN]: 403,
            [ErrorCode.INVALID_CREDENTIALS]: 401,
            [ErrorCode.SESSION_EXPIRED]: 401,
            [ErrorCode.TWO_FACTOR_REQUIRED]: 401,
            [ErrorCode.NOT_FOUND]: 404,
            [ErrorCode.ALREADY_EXISTS]: 409,
            [ErrorCode.CONFLICT]: 409,
            [ErrorCode.VALIDATION_ERROR]: 400,
            [ErrorCode.INVALID_PARAMETER]: 400,
            [ErrorCode.INVALID_PARAM]: 400,
            [ErrorCode.INSUFFICIENT_BALANCE]: 400,
            [ErrorCode.OPERATION_FAILED]: 500,
            [ErrorCode.BUSINESS_ERROR]: 400,
            [ErrorCode.DUPLICATE_ENTRY]: 409,
            [ErrorCode.DATABASE_ERROR]: 500,
            [ErrorCode.SERVICE_UNAVAILABLE]: 503
        };

        return statusMap[errorCode] || 500;
    }

    /**
     * 🔒 记录安全事件
     */
    static logSecurityEvent(
        event: string,
        details: any,
        severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    ): void {
        const logData = {
            event,
            severity,
            details: this.IS_PRODUCTION ? this.removeSensitivePaths(JSON.stringify(details)) : details,
            timestamp: new Date().toISOString()
        };

        if (severity === 'critical' || severity === 'high') {
            console.error('[SecurityEvent]', logData);
        } else {
            console.warn('[SecurityEvent]', logData);
        }

        // TODO: 发送到安全监控系统 (Sentry, DataDog, etc.)
    }
}

/**
 * 🔒 错误处理中间件示例
 *
 * 使用方式:
 * ```typescript
 * try {
 *   // 业务逻辑
 * } catch (error) {
 *   const sanitizedError = ErrorSanitizer.sanitize(error, requestId);
 *   const httpStatus = ErrorSanitizer.getHttpStatus(sanitizedError.code);
 *
 *   res.status(httpStatus).json({
 *     error: sanitizedError
 *   });
 * }
 * ```
 */
