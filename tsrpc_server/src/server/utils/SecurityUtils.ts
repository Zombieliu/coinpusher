import crypto from 'crypto';

/**
 * 🔒 安全工具集
 *
 * 包含：
 * - HMAC签名生成与验证
 * - 时间戳防重放检查
 * - 请求完整性校验
 */

// 🔒 从环境变量读取密钥（生产环境必须配置）
const INTERNAL_SECRET_KEY = process.env.INTERNAL_SECRET_KEY || (
    process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
        ? 'TEST_KEY_FOR_DEVELOPMENT_ONLY_DO_NOT_USE_IN_PRODUCTION_32_CHARS_MIN'
        : undefined
);

// 启动时验证密钥（生产环境严格要求）
if (!INTERNAL_SECRET_KEY) {
    console.error('');
    console.error('❌ FATAL ERROR: INTERNAL_SECRET_KEY is not set!');
    console.error('');
    console.error('Please generate a strong random key:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('');
    console.error('Then set it in your .env file:');
    console.error('  INTERNAL_SECRET_KEY=<generated_key>');
    console.error('');
    throw new Error('INTERNAL_SECRET_KEY is required');
}

// 警告：使用默认密钥
if (INTERNAL_SECRET_KEY.includes('TEST_KEY') || INTERNAL_SECRET_KEY.includes('DO_NOT_USE')) {
    console.warn('');
    console.warn('⚠️  WARNING: Using default INTERNAL_SECRET_KEY for testing!');
    console.warn('⚠️  This is INSECURE and should NEVER be used in production!');
    console.warn('');
}

if (INTERNAL_SECRET_KEY.length < 32) {
    console.error('');
    console.error('❌ FATAL ERROR: INTERNAL_SECRET_KEY is too short!');
    console.error(`Current length: ${INTERNAL_SECRET_KEY.length}, Required: 32+`);
    console.error('');
    throw new Error('INTERNAL_SECRET_KEY must be at least 32 characters');
}

// 警告：检测到使用默认密钥
if (INTERNAL_SECRET_KEY === 'INTERNAL_SECRET_TOKEN_123' ||
    INTERNAL_SECRET_KEY === 'REPLACE_WITH_STRONG_RANDOM_KEY_AT_LEAST_32_CHARS') {
    console.error('');
    console.error('⚠️  CRITICAL SECURITY WARNING ⚠️');
    console.error('You are using the default INTERNAL_SECRET_KEY!');
    console.error('This is EXTREMELY INSECURE and will be exploited!');
    console.error('');
    console.error('Generate a new key immediately:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('');

    // 生产环境拒绝启动
    if (process.env.NODE_ENV === 'production') {
        console.error('Production mode detected - refusing to start!');
        process.exit(1);
    }

    console.error('Development mode - allowing startup but this MUST be fixed!');
    console.error('');
}

// 时间戳容差（秒）
const TIMESTAMP_TOLERANCE_SECONDS = parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS || '5', 10);

/**
 * 生成请求签名
 * @param payload 要签名的数据对象
 * @returns HMAC-SHA256签名（hex格式）
 */
export function generateSignature(payload: Record<string, any>): string {
    // 按键名排序，确保签名一致性
    const sortedKeys = Object.keys(payload).sort();
    const signatureString = sortedKeys
        .map(key => `${key}=${payload[key]}`)
        .join('&');

    const secretKey = INTERNAL_SECRET_KEY || 'INTERNAL_SECRET_TOKEN_123';
    return crypto
        .createHmac('sha256', secretKey)
        .update(signatureString)
        .digest('hex');
}

/**
 * 验证请求签名
 * @param payload 要验证的数据对象
 * @param signature 客户端提供的签名
 * @returns true=签名有效, false=签名无效
 */
export function verifySignature(payload: Record<string, any>, signature: string): boolean {
    const expectedSignature = generateSignature(payload);
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
    );
}

/**
 * 验证内部服务Token（兼容旧版）
 * @param token 客户端提供的Token
 * @returns true=有效, false=无效
 */
export function verifyInternalToken(token: string): boolean {
    const secretKey = INTERNAL_SECRET_KEY || 'INTERNAL_SECRET_TOKEN_123';
    return crypto.timingSafeEqual(
        Buffer.from(secretKey),
        Buffer.from(token)
    );
}

/**
 * 验证时间戳（防重放攻击）
 * @param timestamp 客户端提供的时间戳（毫秒）
 * @param toleranceSeconds 容差（秒）
 * @returns true=时间戳有效, false=时间戳过期或未来
 */
export function verifyTimestamp(timestamp: number, toleranceSeconds: number = TIMESTAMP_TOLERANCE_SECONDS): boolean {
    const now = Date.now();
    const diff = Math.abs(now - timestamp);
    const toleranceMs = toleranceSeconds * 1000;

    if (diff > toleranceMs) {
        console.warn(`[Security] Timestamp expired: diff=${diff}ms, tolerance=${toleranceMs}ms`);
        return false;
    }

    return true;
}

/**
 * 完整的请求验证（签名 + 时间戳）
 * @param req 请求对象（必须包含signature和timestamp字段）
 * @returns {valid: boolean, error?: string}
 */
export function verifyRequest(req: any): { valid: boolean; error?: string } {
    // 1. 检查是否包含必要字段
    if (!req.signature) {
        return { valid: false, error: 'Missing signature' };
    }

    if (!req.timestamp) {
        return { valid: false, error: 'Missing timestamp' };
    }

    // 2. 验证时间戳
    if (!verifyTimestamp(req.timestamp)) {
        return { valid: false, error: 'Request expired or invalid timestamp' };
    }

    // 3. 提取签名，构建验证payload
    const { signature, ...payload } = req;

    // 4. 验证签名
    try {
        if (!verifySignature(payload, signature)) {
            return { valid: false, error: 'Invalid signature' };
        }
    } catch (err) {
        console.error('[Security] Signature verification error:', err);
        return { valid: false, error: 'Signature verification failed' };
    }

    return { valid: true };
}

/**
 * 生成安全的随机字符串
 * @param length 长度（字节数）
 * @returns hex格式的随机字符串
 */
export function generateRandomString(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成nonce（用于防重放）
 * @returns 格式: timestamp_randomString
 */
export function generateNonce(): string {
    return `${Date.now()}_${generateRandomString(8)}`;
}

/**
 * 验证nonce（检查是否在有效期内）
 * @param nonce nonce字符串
 * @param toleranceSeconds 容差（秒）
 * @returns true=有效, false=过期
 */
export function verifyNonce(nonce: string, toleranceSeconds: number = TIMESTAMP_TOLERANCE_SECONDS): boolean {
    const parts = nonce.split('_');
    if (parts.length < 2) {
        return false;
    }

    const timestamp = parseInt(parts[0], 10);
    if (isNaN(timestamp)) {
        return false;
    }

    return verifyTimestamp(timestamp, toleranceSeconds);
}

/**
 * 生成带签名的内部API请求
 * @param data 请求数据
 * @returns 带签名和时间戳的请求对象
 */
export function signInternalRequest<T extends Record<string, any>>(data: T): T & { signature: string; timestamp: number } {
    const timestamp = Date.now();
    const payload = { ...data, timestamp };
    const signature = generateSignature(payload);

    return { ...payload, signature };
}
