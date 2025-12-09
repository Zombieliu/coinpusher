/**
 * 统一错误处理器
 *
 * 功能:
 * - 统一API错误格式
 * - 自动错误分类
 * - 错误日志记录
 * - 错误脱敏（生产环境）
 * - 用户友好的错误消息
 *
 * 使用示例:
 * ```typescript
 * export async function ApiGetUser(call: ApiCall<ReqGetUser, ResGetUser>) {
 *     try {
 *         const user = await UserDB.getUserById(call.req.userId);
 *         if (!user) {
 *             throw ErrorHandler.notFound('用户不存在', { userId: call.req.userId });
 *         }
 *         call.succ({ user });
 *     } catch (error) {
 *         ErrorHandler.handle(error, call);
 *     }
 * }
 * ```
 */

import { Logger } from './Logger';
import { ErrorSanitizer, ErrorCode } from './ErrorSanitizer';

/**
 * 业务错误类
 */
export class BusinessError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public context?: any
    ) {
        super(message);
        this.name = 'BusinessError';
    }
}

/**
 * 错误处理器
 */
export class ErrorHandler {
    /**
     * 处理API错误 (通用方法)
     */
    static handle(error: any, call?: any, context?: any): void {
        // 记录错误日志
        const logContext = {
            ...context,
            requestId: call?.req?.__reqId,
            userId: call?.req?.userId || call?.req?.__userId
        };

        Logger.error('API error occurred', logContext, error);

        // 如果有call对象，返回错误给客户端
        if (call) {
            const sanitized = ErrorSanitizer.sanitize(error, call.req?.__reqId);
            call.error(sanitized.message, {
                code: sanitized.code,
                requestId: sanitized.requestId
            });
        }
    }

    /**
     * 处理数据库错误
     */
    static handleDatabaseError(error: any, operation: string, context?: any): never {
        Logger.error('Database error', { operation, ...context }, error);

        // MongoDB错误码映射
        if (error.code === 11000) {
            throw new BusinessError(
                ErrorCode.DUPLICATE_ENTRY,
                '记录已存在',
                { operation, ...context }
            );
        }

        if (error.code === 121) {
            throw new BusinessError(
                ErrorCode.VALIDATION_ERROR,
                '数据验证失败',
                { operation, ...context }
            );
        }

        throw new BusinessError(
            ErrorCode.DATABASE_ERROR,
            '数据库操作失败',
            { operation, ...context }
        );
    }

    /**
     * 处理业务逻辑错误
     */
    static businessError(
        message: string,
        code: ErrorCode = ErrorCode.BUSINESS_ERROR,
        context?: any
    ): BusinessError {
        return new BusinessError(code, message, context);
    }

    /**
     * 资源未找到错误
     */
    static notFound(message: string, context?: any): BusinessError {
        return new BusinessError(ErrorCode.NOT_FOUND, message, context);
    }

    /**
     * 权限不足错误
     */
    static forbidden(message: string, context?: any): BusinessError {
        return new BusinessError(ErrorCode.FORBIDDEN, message, context);
    }

    /**
     * 参数验证错误
     */
    static invalidParam(message: string, context?: any): BusinessError {
        return new BusinessError(ErrorCode.INVALID_PARAM, message, context);
    }

    /**
     * 未授权错误
     */
    static unauthorized(message: string = '未授权访问', context?: any): BusinessError {
        return new BusinessError(ErrorCode.UNAUTHORIZED, message, context);
    }

    /**
     * 服务不可用错误
     */
    static serviceUnavailable(message: string, context?: any): BusinessError {
        return new BusinessError(ErrorCode.SERVICE_UNAVAILABLE, message, context);
    }

    /**
     * 速率限制错误
     */
    static rateLimitExceeded(message: string = '请求过于频繁', context?: any): BusinessError {
        return new BusinessError(ErrorCode.RATE_LIMIT_EXCEEDED, message, context);
    }
}

/**
 * API调用包装器 - 自动错误处理
 *
 * 使用示例:
 * ```typescript
 * export const ApiGetUser = apiWrapper(async (call: ApiCall<ReqGetUser, ResGetUser>) => {
 *     const user = await UserDB.getUserById(call.req.userId);
 *     if (!user) {
 *         throw ErrorHandler.notFound('用户不存在');
 *     }
 *     return { user };
 * });
 * ```
 */
export function apiWrapper<TReq, TRes>(
    handler: (call: any) => Promise<TRes>
) {
    return async (call: any) => {
        try {
            const result = await handler(call);
            call.succ(result);
        } catch (error) {
            ErrorHandler.handle(error, call);
        }
    };
}

/**
 * 异步操作包装器 - 自动错误处理
 *
 * 使用示例:
 * ```typescript
 * const user = await asyncWrapper(
 *     () => UserDB.getUserById(userId),
 *     '获取用户失败'
 * );
 * ```
 */
export async function asyncWrapper<T>(
    operation: () => Promise<T>,
    errorMessage: string = '操作失败',
    context?: any
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        Logger.error(errorMessage, context, error);

        // 如果是已知的业务错误，直接抛出
        if (error instanceof BusinessError) {
            throw error;
        }

        // 如果是数据库错误，转换为业务错误
        if (error && typeof error === 'object' && 'code' in error) {
            throw ErrorHandler.handleDatabaseError(error, errorMessage, context);
        }

        // 其他未知错误
        throw ErrorHandler.businessError(errorMessage, ErrorCode.INTERNAL_ERROR, context);
    }
}

/**
 * 参数验证包装器
 *
 * 使用示例:
 * ```typescript
 * validateRequired(call.req.userId, 'userId');
 * validateEmail(call.req.email, 'email');
 * validateRange(call.req.age, 'age', 0, 150);
 * ```
 */
export function validateRequired(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
        throw ErrorHandler.invalidParam(`${fieldName} 是必填项`);
    }
}

export function validateEmail(email: string, fieldName: string = 'email'): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw ErrorHandler.invalidParam(`${fieldName} 格式不正确`);
    }
}

export function validateRange(
    value: number,
    fieldName: string,
    min: number,
    max: number
): void {
    if (value < min || value > max) {
        throw ErrorHandler.invalidParam(
            `${fieldName} 必须在 ${min} 到 ${max} 之间`
        );
    }
}

export function validateLength(
    value: string,
    fieldName: string,
    minLength: number,
    maxLength?: number
): void {
    if (value.length < minLength) {
        throw ErrorHandler.invalidParam(
            `${fieldName} 长度不能少于 ${minLength} 个字符`
        );
    }
    if (maxLength && value.length > maxLength) {
        throw ErrorHandler.invalidParam(
            `${fieldName} 长度不能超过 ${maxLength} 个字符`
        );
    }
}

export function validateEnum<T>(
    value: T,
    fieldName: string,
    allowedValues: T[]
): void {
    if (!allowedValues.includes(value)) {
        throw ErrorHandler.invalidParam(
            `${fieldName} 必须是以下值之一: ${allowedValues.join(', ')}`
        );
    }
}

/**
 * 数据库操作包装器
 *
 * 使用示例:
 * ```typescript
 * const user = await dbWrapper(
 *     () => collection.findOne({ userId }),
 *     'findUser'
 * );
 * ```
 */
export async function dbWrapper<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: any
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        throw ErrorHandler.handleDatabaseError(error, operationName, context);
    }
}
