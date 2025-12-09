/**
 * 统一日志系统
 *
 * 功能:
 * - 分级日志 (DEBUG/INFO/WARN/ERROR/FATAL)
 * - 结构化日志输出
 * - 自动添加上下文 (timestamp, service, requestId)
 * - 支持多种输出 (console, file, remote)
 * - 生产环境自动脱敏
 *
 * 使用示例:
 * ```typescript
 * // 初始化
 * Logger.initialize({
 *   serviceName: 'gate-server',
 *   minLevel: LogLevel.INFO
 * });
 *
 * // 基础使用
 * Logger.info('User login', { userId: 'u123', ip: '1.2.3.4' });
 * Logger.error('DB query failed', { query: 'SELECT...' }, error);
 *
 * // 子日志器 (携带固定上下文)
 * const userLogger = Logger.child({ userId: 'u123' });
 * userLogger.info('Profile updated');
 * userLogger.error('Payment failed', { orderId: 'o456' }, error);
 * ```
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}

export interface LogContext {
    service?: string;      // 服务名称
    userId?: string;       // 用户ID
    requestId?: string;    // 请求ID
    ip?: string;          // IP地址
    [key: string]: any;   // 其他上下文
}

interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: any;
    stack?: string;
}

export class Logger {
    private static minLevel: LogLevel = LogLevel.INFO;
    private static serviceName: string = 'unknown';
    private static outputs: LogOutput[] = [];
    private static isInitialized: boolean = false;

    /**
     * 初始化日志系统
     */
    static initialize(config: {
        serviceName: string;
        minLevel?: LogLevel;
        outputs?: LogOutput[];
    }): void {
        this.serviceName = config.serviceName;
        this.minLevel = config.minLevel ?? LogLevel.INFO;
        this.outputs = config.outputs ?? [new ConsoleOutput()];
        this.isInitialized = true;

        this.info('Logger initialized', {
            serviceName: this.serviceName,
            minLevel: LogLevel[this.minLevel]
        });
    }

    /**
     * DEBUG级别日志
     */
    static debug(message: string, context?: LogContext): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    /**
     * INFO级别日志
     */
    static info(message: string, context?: LogContext): void {
        this.log(LogLevel.INFO, message, context);
    }

    /**
     * WARN级别日志
     */
    static warn(message: string, context?: LogContext, error?: any): void {
        this.log(LogLevel.WARN, message, context, error);
    }

    /**
     * ERROR级别日志
     */
    static error(message: string, context?: LogContext, error?: any): void {
        this.log(LogLevel.ERROR, message, context, error);
    }

    /**
     * FATAL级别日志 (记录后可能触发告警)
     */
    static fatal(message: string, context?: LogContext, error?: any): void {
        this.log(LogLevel.FATAL, message, context, error);
        // TODO: 触发告警 (PagerDuty, Slack等)
    }

    /**
     * 核心日志方法
     */
    private static log(
        level: LogLevel,
        message: string,
        context?: LogContext,
        error?: any
    ): void {
        // 如果未初始化，使用默认配置
        if (!this.isInitialized) {
            this.initialize({ serviceName: 'default' });
        }

        // 过滤低于最小级别的日志
        if (level < this.minLevel) {
            return;
        }

        // 构建日志条目
        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
            context: {
                service: this.serviceName,
                ...context
            }
        };

        // 处理错误对象
        if (error) {
            if (error instanceof Error) {
                entry.error = {
                    name: error.name,
                    message: error.message
                };
                entry.stack = error.stack;
            } else {
                entry.error = error;
            }

            // 生产环境脱敏
            if (process.env.NODE_ENV === 'production') {
                // 简单脱敏：移除路径信息
                if (entry.stack) {
                    entry.stack = entry.stack.replace(/\/[^ \n]+\//g, '.../');
                }
            }
        }

        // 输出到所有配置的输出
        for (const output of this.outputs) {
            try {
                output.write(entry);
            } catch (err) {
                // 防止日志输出失败影响主流程
                console.error('[Logger] Failed to write log:', err);
            }
        }
    }

    /**
     * 创建子日志器 (携带特定上下文)
     */
    static child(context: LogContext): ChildLogger {
        return new ChildLogger(context);
    }
}

/**
 * 子日志器 - 携带固定上下文
 */
export class ChildLogger {
    constructor(private context: LogContext) {}

    debug(message: string, extraContext?: LogContext): void {
        Logger.debug(message, { ...this.context, ...extraContext });
    }

    info(message: string, extraContext?: LogContext): void {
        Logger.info(message, { ...this.context, ...extraContext });
    }

    warn(message: string, extraContext?: LogContext, error?: any): void {
        Logger.warn(message, { ...this.context, ...extraContext }, error);
    }

    error(message: string, extraContext?: LogContext, error?: any): void {
        Logger.error(message, { ...this.context, ...extraContext }, error);
    }

    fatal(message: string, extraContext?: LogContext, error?: any): void {
        Logger.fatal(message, { ...this.context, ...extraContext }, error);
    }
}

/**
 * 日志输出接口
 */
export interface LogOutput {
    write(entry: LogEntry): void;
}

/**
 * 控制台输出
 */
export class ConsoleOutput implements LogOutput {
    private colors = {
        [LogLevel.DEBUG]: '\x1b[36m',   // 青色
        [LogLevel.INFO]: '\x1b[32m',    // 绿色
        [LogLevel.WARN]: '\x1b[33m',    // 黄色
        [LogLevel.ERROR]: '\x1b[31m',   // 红色
        [LogLevel.FATAL]: '\x1b[35m'    // 紫色
    };

    write(entry: LogEntry): void {
        const color = this.colors[entry.level];
        const reset = '\x1b[0m';
        const timestamp = new Date(entry.timestamp).toISOString();
        const level = LogLevel[entry.level].padEnd(5);

        const contextStr = entry.context && Object.keys(entry.context).length > 1
            ? ` ${JSON.stringify(entry.context)}`
            : '';

        const errorStr = entry.error
            ? `\n  ${JSON.stringify(entry.error, null, 2)}`
            : '';

        const stackStr = entry.stack && entry.level >= LogLevel.ERROR
            ? `\n${entry.stack}`
            : '';

        console.log(
            `${color}[${timestamp}] ${level}${reset} ${entry.message}${contextStr}${errorStr}${stackStr}`
        );
    }
}

/**
 * 文件输出
 */
export class FileOutput implements LogOutput {
    constructor(private filepath: string) {}

    write(entry: LogEntry): void {
        const fs = require('fs');
        const line = JSON.stringify(entry) + '\n';

        try {
            fs.appendFileSync(this.filepath, line);
        } catch (error) {
            // 文件写入失败，降级到console
            console.error(`[FileOutput] Failed to write to ${this.filepath}:`, error);
        }
    }
}
