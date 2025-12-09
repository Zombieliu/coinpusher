import { Logger, LogLevel, ConsoleOutput } from '../src/server/utils/Logger';

describe('Logger', () => {
    beforeEach(() => {
        // 重置Logger状态
        Logger.initialize({
            serviceName: 'test-service',
            minLevel: LogLevel.DEBUG
        });
    });

    it('should log at different levels', () => {
        // 这些不应该抛出错误
        Logger.debug('Debug message');
        Logger.info('Info message');
        Logger.warn('Warning message');
        Logger.error('Error message');
    });

    it('should log with context', () => {
        Logger.info('User action', {
            userId: 'user123',
            action: 'login'
        });
    });

    it('should log errors', () => {
        const error = new Error('Test error');
        Logger.error('Something failed', { operation: 'test' }, error);
    });

    it('should create child logger with context', () => {
        const userLogger = Logger.child({ userId: 'user456' });
        userLogger.info('Child logger message');
        userLogger.error('Child error', undefined, new Error('Child error'));
    });

    it('should filter logs by level', () => {
        // 重新初始化为只显示 WARN 及以上
        Logger.initialize({
            serviceName: 'test-service',
            minLevel: LogLevel.WARN
        });

        // 这些应该被过滤掉（不会输出，但也不会报错）
        Logger.debug('Should not show');
        Logger.info('Should not show');

        // 这些应该显示
        Logger.warn('Should show');
        Logger.error('Should show');
    });
});
