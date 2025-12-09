/**
 * 🔒 密码验证工具
 *
 * 确保管理员密码符合安全要求
 */

export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong' | 'very_strong';
}

/**
 * 验证密码强度
 * @param password 待验证的密码
 * @returns 验证结果
 */
export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // 1. 最小长度检查（12个字符）
    if (password.length < 12) {
        errors.push('密码必须至少12个字符');
    } else {
        score += 1;
        if (password.length >= 16) score += 1;
        if (password.length >= 20) score += 1;
    }

    // 2. 大写字母检查
    if (!/[A-Z]/.test(password)) {
        errors.push('密码必须包含至少一个大写字母');
    } else {
        score += 1;
    }

    // 3. 小写字母检查
    if (!/[a-z]/.test(password)) {
        errors.push('密码必须包含至少一个小写字母');
    } else {
        score += 1;
    }

    // 4. 数字检查
    if (!/\d/.test(password)) {
        errors.push('密码必须包含至少一个数字');
    } else {
        score += 1;
    }

    // 5. 特殊字符检查
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('密码必须包含至少一个特殊字符 (!@#$%^&*等)');
    } else {
        score += 1;
    }

    // 6. 常见弱密码检查
    const weakPasswords = [
        'password', '12345678', 'admin123', 'qwerty123', 'abc12345',
        'password123', 'admin12345', '123456789', 'test123456'
    ];

    const lowerPassword = password.toLowerCase();
    for (const weak of weakPasswords) {
        if (lowerPassword.includes(weak)) {
            errors.push('密码包含常见弱密码模式，请使用更复杂的密码');
            score = Math.max(0, score - 2);
            break;
        }
    }

    // 7. 重复字符检查
    if (/(.)\1{2,}/.test(password)) {
        errors.push('密码包含过多重复字符');
        score = Math.max(0, score - 1);
    }

    // 8. 连续字符检查
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
        errors.push('密码包含连续字符序列');
        score = Math.max(0, score - 1);
    }

    // 计算强度
    let strength: 'weak' | 'medium' | 'strong' | 'very_strong' = 'weak';
    if (score >= 7) strength = 'very_strong';
    else if (score >= 5) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return {
        valid: errors.length === 0,
        errors,
        strength
    };
}

/**
 * 生成随机强密码
 * @param length 密码长度（默认16）
 * @returns 随机密码
 */
export function generateRandomPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + specials;

    let password = '';

    // 确保每种类型至少有一个
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specials[Math.floor(Math.random() * specials.length)];

    // 填充剩余长度
    for (let i = password.length; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // 打乱顺序
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 检查密码是否已过期
 * @param lastChangeTime 上次修改时间（毫秒）
 * @param maxAgeDays 最大年龄（天）
 * @returns true=已过期
 */
export function isPasswordExpired(lastChangeTime: number, maxAgeDays: number = 90): boolean {
    const now = Date.now();
    const ageMs = now - lastChangeTime;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return ageDays > maxAgeDays;
}
