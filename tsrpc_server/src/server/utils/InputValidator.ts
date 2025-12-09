import * as validator from 'validator';

/**
 * 🔒 Advanced Input Validation and Sanitization Framework
 *
 * 防止注入攻击:
 * - SQL/NoSQL Injection
 * - XSS (Cross-Site Scripting)
 * - Command Injection
 * - Path Traversal
 * - LDAP Injection
 *
 * 安全原则:
 * - 白名单验证 (允许已知安全的输入)
 * - 类型验证 (确保数据类型正确)
 * - 长度限制 (防止缓冲区溢出)
 * - 格式验证 (确保符合预期格式)
 */

export enum ValidationRule {
    // 字符串规则
    ALPHANUMERIC = 'alphanumeric',      // 只允许字母和数字
    ALPHABETIC = 'alphabetic',           // 只允许字母
    NUMERIC = 'numeric',                 // 只允许数字
    EMAIL = 'email',                     // 邮箱格式
    URL = 'url',                         // URL格式
    UUID = 'uuid',                       // UUID格式
    MONGODB_ID = 'mongodb_id',           // MongoDB ObjectID
    USERNAME = 'username',               // 用户名 (字母数字下划线)
    PASSWORD = 'password',               // 强密码
    IP = 'ip',                          // IP地址

    // 数字规则
    INTEGER = 'integer',                 // 整数
    POSITIVE_INTEGER = 'positive_int',   // 正整数
    FLOAT = 'float',                     // 浮点数
    POSITIVE_FLOAT = 'positive_float',   // 正浮点数

    // 特殊规则
    SAFE_STRING = 'safe_string',         // 安全字符串 (无特殊字符)
    JSON = 'json',                       // 有效的JSON
    BASE64 = 'base64',                   // Base64编码
    HEX = 'hex'                          // 十六进制
}

export interface ValidationConfig {
    rule: ValidationRule;
    min?: number;                        // 最小长度/值
    max?: number;                        // 最大长度/值
    required?: boolean;                  // 是否必填
    allowEmpty?: boolean;                // 是否允许空字符串
    customPattern?: RegExp;              // 自定义正则表达式
    customValidator?: (value: any) => boolean;  // 自定义验证函数
}

export interface ValidationResult {
    valid: boolean;
    sanitized?: any;                     // 净化后的值
    errors: string[];
}

export class InputValidator {
    /**
     * 🔒 验证单个输入
     */
    static validate(
        value: any,
        config: ValidationConfig
    ): ValidationResult {
        const errors: string[] = [];

        // 检查必填
        if (config.required && (value === undefined || value === null)) {
            errors.push('Field is required');
            return { valid: false, errors };
        }

        // 允许空值
        if (!config.required && (value === undefined || value === null)) {
            return { valid: true, sanitized: value, errors: [] };
        }

        // 检查空字符串
        if (typeof value === 'string' && value === '' && !config.allowEmpty) {
            errors.push('Empty string not allowed');
            return { valid: false, errors };
        }

        // 类型验证
        let sanitized = value;
        switch (config.rule) {
            case ValidationRule.ALPHANUMERIC:
                sanitized = this.validateAlphanumeric(value, config, errors);
                break;
            case ValidationRule.ALPHABETIC:
                sanitized = this.validateAlphabetic(value, config, errors);
                break;
            case ValidationRule.NUMERIC:
                sanitized = this.validateNumeric(value, config, errors);
                break;
            case ValidationRule.EMAIL:
                sanitized = this.validateEmail(value, errors);
                break;
            case ValidationRule.URL:
                sanitized = this.validateURL(value, errors);
                break;
            case ValidationRule.UUID:
                sanitized = this.validateUUID(value, errors);
                break;
            case ValidationRule.MONGODB_ID:
                sanitized = this.validateMongoDBId(value, errors);
                break;
            case ValidationRule.USERNAME:
                sanitized = this.validateUsername(value, config, errors);
                break;
            case ValidationRule.PASSWORD:
                sanitized = this.validatePassword(value, config, errors);
                break;
            case ValidationRule.IP:
                sanitized = this.validateIP(value, errors);
                break;
            case ValidationRule.INTEGER:
                sanitized = this.validateInteger(value, config, errors);
                break;
            case ValidationRule.POSITIVE_INTEGER:
                sanitized = this.validatePositiveInteger(value, config, errors);
                break;
            case ValidationRule.FLOAT:
                sanitized = this.validateFloat(value, config, errors);
                break;
            case ValidationRule.POSITIVE_FLOAT:
                sanitized = this.validatePositiveFloat(value, config, errors);
                break;
            case ValidationRule.SAFE_STRING:
                sanitized = this.validateSafeString(value, config, errors);
                break;
            case ValidationRule.JSON:
                sanitized = this.validateJSON(value, errors);
                break;
            case ValidationRule.BASE64:
                sanitized = this.validateBase64(value, errors);
                break;
            case ValidationRule.HEX:
                sanitized = this.validateHex(value, errors);
                break;
            default:
                errors.push(`Unknown validation rule: ${config.rule}`);
        }

        // 自定义验证
        if (config.customValidator && !config.customValidator(sanitized)) {
            errors.push('Custom validation failed');
        }

        return {
            valid: errors.length === 0,
            sanitized,
            errors
        };
    }

    /**
     * 🔒 验证多个字段
     */
    static validateObject(
        obj: any,
        schema: Record<string, ValidationConfig>
    ): {
        valid: boolean;
        sanitized: any;
        errors: Record<string, string[]>;
    } {
        const sanitized: any = {};
        const errors: Record<string, string[]> = {};
        let valid = true;

        for (const [key, config] of Object.entries(schema)) {
            const result = this.validate(obj[key], config);

            if (!result.valid) {
                errors[key] = result.errors;
                valid = false;
            } else {
                sanitized[key] = result.sanitized;
            }
        }

        return { valid, sanitized, errors };
    }

    // ==================== 具体验证方法 ====================

    private static validateAlphanumeric(value: any, config: ValidationConfig, errors: string[]): string {
        const str = String(value);
        if (!/^[a-zA-Z0-9]+$/.test(str)) {
            errors.push('Must contain only letters and numbers');
            return str;
        }
        return this.checkLength(str, config, errors);
    }

    private static validateAlphabetic(value: any, config: ValidationConfig, errors: string[]): string {
        const str = String(value);
        if (!/^[a-zA-Z]+$/.test(str)) {
            errors.push('Must contain only letters');
            return str;
        }
        return this.checkLength(str, config, errors);
    }

    private static validateNumeric(value: any, config: ValidationConfig, errors: string[]): string {
        const str = String(value);
        if (!/^\d+$/.test(str)) {
            errors.push('Must contain only digits');
            return str;
        }
        return this.checkLength(str, config, errors);
    }

    private static validateEmail(value: any, errors: string[]): string {
        const str = String(value).trim().toLowerCase();
        if (!validator.isEmail(str)) {
            errors.push('Invalid email format');
        }
        return str;
    }

    private static validateURL(value: any, errors: string[]): string {
        const str = String(value).trim();
        if (!validator.isURL(str, { protocols: ['http', 'https'], require_protocol: true })) {
            errors.push('Invalid URL format');
        }
        return str;
    }

    private static validateUUID(value: any, errors: string[]): string {
        const str = String(value);
        if (!validator.isUUID(str)) {
            errors.push('Invalid UUID format');
        }
        return str;
    }

    private static validateMongoDBId(value: any, errors: string[]): string {
        const str = String(value);
        if (!/^[a-f0-9]{24}$/i.test(str)) {
            errors.push('Invalid MongoDB ObjectID format');
        }
        return str;
    }

    private static validateUsername(value: any, config: ValidationConfig, errors: string[]): string {
        const str = String(value).trim();

        // 用户名: 字母、数字、下划线，3-20字符
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(str)) {
            errors.push('Username must be 3-20 characters (letters, numbers, underscore)');
        }

        // 不能以数字开头
        if (/^\d/.test(str)) {
            errors.push('Username cannot start with a number');
        }

        return str;
    }

    private static validatePassword(value: any, config: ValidationConfig, errors: string[]): string {
        const str = String(value);

        const minLength = config.min || 8;
        const maxLength = config.max || 128;

        if (str.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters`);
        }

        if (str.length > maxLength) {
            errors.push(`Password must not exceed ${maxLength} characters`);
        }

        // 强密码要求
        if (!/[A-Z]/.test(str)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(str)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(str)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(str)) {
            errors.push('Password must contain at least one special character');
        }

        return str;
    }

    private static validateIP(value: any, errors: string[]): string {
        const str = String(value);
        if (!validator.isIP(str)) {
            errors.push('Invalid IP address');
        }
        return str;
    }

    private static validateInteger(value: any, config: ValidationConfig, errors: string[]): number {
        const num = Number(value);
        if (!Number.isInteger(num)) {
            errors.push('Must be an integer');
            return num;
        }
        return this.checkRange(num, config, errors);
    }

    private static validatePositiveInteger(value: any, config: ValidationConfig, errors: string[]): number {
        const num = this.validateInteger(value, config, errors);
        if (num < 0) {
            errors.push('Must be a positive integer');
        }
        return num;
    }

    private static validateFloat(value: any, config: ValidationConfig, errors: string[]): number {
        const num = Number(value);
        if (isNaN(num)) {
            errors.push('Must be a valid number');
            return num;
        }
        return this.checkRange(num, config, errors);
    }

    private static validatePositiveFloat(value: any, config: ValidationConfig, errors: string[]): number {
        const num = this.validateFloat(value, config, errors);
        if (num < 0) {
            errors.push('Must be a positive number');
        }
        return num;
    }

    private static validateSafeString(value: any, config: ValidationConfig, errors: string[]): string {
        const str = String(value);

        // 移除危险字符: <, >, &, ", ', /, \, ;
        const sanitized = str.replace(/[<>&"';\/\\]/g, '');

        if (sanitized !== str) {
            errors.push('String contains unsafe characters (removed)');
        }

        return this.checkLength(sanitized, config, errors);
    }

    private static validateJSON(value: any, errors: string[]): any {
        try {
            if (typeof value === 'string') {
                return JSON.parse(value);
            }
            return value;
        } catch (e) {
            errors.push('Invalid JSON format');
            return value;
        }
    }

    private static validateBase64(value: any, errors: string[]): string {
        const str = String(value);
        if (!validator.isBase64(str)) {
            errors.push('Invalid Base64 encoding');
        }
        return str;
    }

    private static validateHex(value: any, errors: string[]): string {
        const str = String(value);
        if (!/^[a-f0-9]+$/i.test(str)) {
            errors.push('Invalid hexadecimal format');
        }
        return str;
    }

    // ==================== 辅助方法 ====================

    private static checkLength(str: string, config: ValidationConfig, errors: string[]): string {
        if (config.min !== undefined && str.length < config.min) {
            errors.push(`Length must be at least ${config.min}`);
        }
        if (config.max !== undefined && str.length > config.max) {
            errors.push(`Length must not exceed ${config.max}`);
        }
        return str;
    }

    private static checkRange(num: number, config: ValidationConfig, errors: string[]): number {
        if (config.min !== undefined && num < config.min) {
            errors.push(`Value must be at least ${config.min}`);
        }
        if (config.max !== undefined && num > config.max) {
            errors.push(`Value must not exceed ${config.max}`);
        }
        return num;
    }

    /**
     * 🔒 SQL/NoSQL 注入防护
     */
    static sanitizeForQuery(value: string): string {
        // 移除 MongoDB 操作符
        return value.replace(/[${}]/g, '');
    }

    /**
     * 🔒 XSS 防护
     */
    static sanitizeForHTML(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * 🔒 路径遍历防护
     */
    static sanitizePath(value: string): string {
        // 移除 ../ 和 ..\
        return value.replace(/\.\.[\/\\]/g, '');
    }

    /**
     * 🔒 命令注入防护
     */
    static sanitizeForCommand(value: string): string {
        // 移除 shell 特殊字符
        return value.replace(/[;&|`$(){}[\]<>]/g, '');
    }
}

/**
 * 🔒 使用示例
 *
 * ```typescript
 * // 验证单个字段
 * const result = InputValidator.validate(username, {
 *   rule: ValidationRule.USERNAME,
 *   required: true
 * });
 *
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 *
 * // 验证对象
 * const schema = {
 *   username: { rule: ValidationRule.USERNAME, required: true },
 *   email: { rule: ValidationRule.EMAIL, required: true },
 *   age: { rule: ValidationRule.POSITIVE_INTEGER, min: 0, max: 150 }
 * };
 *
 * const validation = InputValidator.validateObject(userData, schema);
 * if (validation.valid) {
 *   // 使用 validation.sanitized (已净化的数据)
 * }
 * ```
 */
