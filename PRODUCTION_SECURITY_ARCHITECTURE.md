# 🏭 生产级安全架构设计

**适用场景**: 有真实经济价值的推币机游戏（Web3 + 法币混合）

---

## 🎯 安全等级分类

### 🔴 P0 - 必须实现（上线前）
不实现会导致直接经济损失或法律风险

### 🟡 P1 - 强烈建议（上线后1个月内）
不实现会导致用户流失或运营困难

### 🟢 P2 - 优化项（3-6个月）
提升用户体验和运营效率

---

## 🔴 P0 级别：核心安全（必须实现）

### 1. 分布式限流（Redis）

**问题**: 当前内存限流器无法跨服务器共享，多实例部署会失效

**方案**: 基于Redis的分布式限流

```typescript
// tsrpc_server/src/server/utils/RedisRateLimiter.ts

import Redis from 'ioredis';

export class RedisRateLimiter {
    private redis: Redis;
    private keyPrefix: string;

    constructor(redis: Redis, name: string) {
        this.redis = redis;
        this.keyPrefix = `ratelimit:${name}:`;
    }

    /**
     * 滑动窗口限流（Redis实现）
     * @param key 用户ID
     * @param max 最大次数
     * @param windowMs 时间窗口（毫秒）
     */
    async checkAndIncrement(key: string, max: number, windowMs: number): Promise<{
        allowed: boolean;
        current: number;
        resetInMs: number;
    }> {
        const redisKey = this.keyPrefix + key;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Lua脚本保证原子性
        const script = `
            -- 清理过期记录
            redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])

            -- 获取当前计数
            local current = redis.call('ZCARD', KEYS[1])

            if current < tonumber(ARGV[3]) then
                -- 未超限，记录本次请求
                redis.call('ZADD', KEYS[1], ARGV[2], ARGV[2])
                redis.call('EXPIRE', KEYS[1], ARGV[4])
                return {1, current + 1}
            else
                -- 超限
                return {0, current}
            end
        `;

        const result = await this.redis.eval(
            script,
            1,
            redisKey,
            windowStart.toString(),  // ARGV[1]: 窗口起始时间
            now.toString(),          // ARGV[2]: 当前时间
            max.toString(),          // ARGV[3]: 最大次数
            Math.ceil(windowMs / 1000).toString() // ARGV[4]: TTL（秒）
        ) as [number, number];

        const allowed = result[0] === 1;
        const current = result[1];

        // 计算重置时间
        let resetInMs = 0;
        if (!allowed) {
            const oldest = await this.redis.zrange(redisKey, 0, 0);
            if (oldest.length > 0) {
                resetInMs = Math.max(0, windowMs - (now - parseInt(oldest[0])));
            }
        }

        return { allowed, current, resetInMs };
    }

    /**
     * Token Bucket 限流（更平滑）
     */
    async checkTokenBucket(key: string, capacity: number, refillRate: number): Promise<boolean> {
        const redisKey = this.keyPrefix + 'tb:' + key;
        const now = Date.now();

        const script = `
            local tokens = tonumber(redis.call('HGET', KEYS[1], 'tokens') or ARGV[1])
            local last_refill = tonumber(redis.call('HGET', KEYS[1], 'last_refill') or ARGV[2])

            -- 计算补充的token
            local elapsed = ARGV[2] - last_refill
            local refill = math.floor(elapsed * ARGV[3] / 1000)
            tokens = math.min(ARGV[1], tokens + refill)

            if tokens >= 1 then
                -- 消耗1个token
                tokens = tokens - 1
                redis.call('HSET', KEYS[1], 'tokens', tokens)
                redis.call('HSET', KEYS[1], 'last_refill', ARGV[2])
                redis.call('EXPIRE', KEYS[1], 3600)
                return 1
            else
                return 0
            end
        `;

        const result = await this.redis.eval(
            script,
            1,
            redisKey,
            capacity.toString(),    // ARGV[1]: 容量
            now.toString(),         // ARGV[2]: 当前时间
            refillRate.toString()   // ARGV[3]: 补充速率（token/秒）
        ) as number;

        return result === 1;
    }
}

// 使用示例
const redis = new Redis(process.env.REDIS_URL);
const dropCoinLimiter = new RedisRateLimiter(redis, 'drop_coin');

// 在ApiDropCoin中使用
const check = await dropCoinLimiter.checkAndIncrement(userId, 60, 60000);
if (!check.allowed) {
    call.error(`Rate limit: ${check.current}/60, reset in ${Math.ceil(check.resetInMs / 1000)}s`);
    return;
}
```

**优势**:
- ✅ 支持水平扩展（多服务器共享限流）
- ✅ Redis持久化，重启不丢失
- ✅ Lua脚本保证原子性
- ✅ Token Bucket算法更平滑

---

### 2. 设备指纹 + IP关联分析

**问题**: 用户可以注册多个账号薅羊毛

**方案**: 综合设备指纹、IP、钱包地址多维度关联

```typescript
// tsrpc_server/src/server/gate/bll/DeviceFingerprint.ts

import { createHash } from 'crypto';

export interface DeviceFingerprintData {
    // 基础信息
    userAgent: string;
    screenResolution: string;
    timezone: number;
    language: string;
    platform: string;

    // 高级指纹
    canvasFingerprint?: string;
    webGLFingerprint?: string;
    audioFingerprint?: string;

    // 网络信息
    ipAddress: string;
    ipCountry?: string;

    // 硬件信息（如果可用）
    hardwareConcurrency?: number;
    deviceMemory?: number;
}

export class DeviceFingerprintService {
    /**
     * 生成设备指纹哈希
     */
    static generateHash(data: DeviceFingerprintData): string {
        const components = [
            data.userAgent,
            data.screenResolution,
            data.timezone,
            data.language,
            data.platform,
            data.canvasFingerprint || '',
            data.webGLFingerprint || '',
            data.hardwareConcurrency || '',
        ];

        const fingerprint = components.join('|');
        return createHash('sha256').update(fingerprint).digest('hex');
    }

    /**
     * 检测可疑关联账号
     */
    static async detectSuspiciousAccounts(userId: string): Promise<{
        isSuspicious: boolean;
        reason: string;
        relatedUsers: string[];
    }> {
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { isSuspicious: false, reason: '', relatedUsers: [] };
        }

        const fingerprint = user.deviceFingerprint;
        const ipAddress = user.lastLoginIP;

        // 1. 查找相同设备指纹的账号
        const sameDeviceUsers = await UserDB.collection.find({
            deviceFingerprint: fingerprint,
            userId: { $ne: userId }
        }).toArray();

        // 2. 查找相同IP的账号（24小时内）
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const sameIPUsers = await UserDB.collection.find({
            lastLoginIP: ipAddress,
            lastLoginTime: { $gte: dayAgo },
            userId: { $ne: userId }
        }).toArray();

        // 3. 查找相同钱包地址的账号（Web3场景）
        const sameWalletUsers = user.walletAddress
            ? await UserDB.collection.find({
                walletAddress: user.walletAddress,
                userId: { $ne: userId }
            }).toArray()
            : [];

        const relatedUsers = [
            ...new Set([
                ...sameDeviceUsers.map(u => u.userId),
                ...sameIPUsers.map(u => u.userId),
                ...sameWalletUsers.map(u => u.userId)
            ])
        ];

        // 风险判定
        let isSuspicious = false;
        let reason = '';

        if (sameDeviceUsers.length >= 3) {
            isSuspicious = true;
            reason = `Same device: ${sameDeviceUsers.length} accounts`;
        } else if (sameIPUsers.length >= 5) {
            isSuspicious = true;
            reason = `Same IP (24h): ${sameIPUsers.length} accounts`;
        } else if (sameWalletUsers.length >= 2) {
            isSuspicious = true;
            reason = `Same wallet: ${sameWalletUsers.length} accounts`;
        }

        return { isSuspicious, reason, relatedUsers };
    }
}

// 客户端收集（Cocos Creator）
// assets/script/game/utils/DeviceFingerprintCollector.ts

export class DeviceFingerprintCollector {
    static async collect(): Promise<DeviceFingerprintData> {
        const data: DeviceFingerprintData = {
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: new Date().getTimezoneOffset(),
            language: navigator.language,
            platform: navigator.platform,
            ipAddress: '', // 服务器端获取

            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: (navigator as any).deviceMemory,
        };

        // Canvas指纹
        data.canvasFingerprint = this.getCanvasFingerprint();

        // WebGL指纹
        data.webGLFingerprint = this.getWebGLFingerprint();

        return data;
    }

    private static getCanvasFingerprint(): string {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Hello, World!', 2, 15);

        return canvas.toDataURL();
    }

    private static getWebGLFingerprint(): string {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) return '';

        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return '';

        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

        return `${vendor}|${renderer}`;
    }
}

// 在登录时验证
async function ApiLogin(call: ApiCall<ReqLogin, ResLogin>) {
    // ... 现有逻辑

    // 更新设备指纹
    if (call.req.deviceFingerprint) {
        const fpHash = DeviceFingerprintService.generateHash(call.req.deviceFingerprint);
        await UserDB.updateUser(userId, {
            deviceFingerprint: fpHash,
            lastLoginIP: call.req.ipAddress,
            lastLoginTime: Date.now()
        });

        // 检测可疑账号
        const detection = await DeviceFingerprintService.detectSuspiciousAccounts(userId);
        if (detection.isSuspicious) {
            console.warn(`[Security] Suspicious login: ${userId}, ${detection.reason}`);

            // 可选：触发人工审核
            await AuditQueue.add({
                userId,
                type: 'suspicious_login',
                reason: detection.reason,
                relatedUsers: detection.relatedUsers
            });
        }
    }
}
```

**防护效果**:
- ✅ 检测多账号滥用
- ✅ 关联分析（设备+IP+钱包）
- ✅ 自动标记可疑账号

---

### 3. 行为分析引擎（欺诈评分）

**问题**: 无法识别异常游戏模式（如脚本、自动化）

**方案**: 实时行为分析 + 机器学习

```typescript
// tsrpc_server/src/server/gate/bll/FraudDetection.ts

export interface UserBehaviorMetrics {
    // 投币行为
    dropCoinFrequency: number;      // 每分钟投币次数
    dropCoinVariance: number;       // 投币时间间隔方差
    dropPositionEntropy: number;    // 投币位置熵（随机性）

    // 收集行为
    collectRate: number;            // 收集成功率
    avgRewardPerSession: number;    // 平均每局收益

    // 会话行为
    sessionDuration: number;        // 平均会话时长
    sessionFrequency: number;       // 每日会话次数

    // 交互行为
    clickSpeed: number;             // 平均点击速度
    mouseMovementEntropy: number;   // 鼠标移动熵
}

export class FraudDetectionEngine {
    /**
     * 计算欺诈评分（0-100）
     * - 0-30: 正常
     * - 30-60: 可疑
     * - 60-100: 高风险
     */
    static async calculateFraudScore(userId: string): Promise<{
        score: number;
        reasons: string[];
        metrics: UserBehaviorMetrics;
    }> {
        const metrics = await this.collectMetrics(userId);
        let score = 0;
        const reasons: string[] = [];

        // 规则1: 投币频率异常（每分钟超过30次）
        if (metrics.dropCoinFrequency > 30) {
            score += 20;
            reasons.push(`High drop frequency: ${metrics.dropCoinFrequency}/min`);
        }

        // 规则2: 投币间隔过于规律（方差过小）
        if (metrics.dropCoinVariance < 50) {
            score += 15;
            reasons.push(`Too regular drop pattern: variance=${metrics.dropCoinVariance}`);
        }

        // 规则3: 投币位置熵过低（总在相同位置）
        if (metrics.dropPositionEntropy < 2.0) {
            score += 15;
            reasons.push(`Low position entropy: ${metrics.dropPositionEntropy}`);
        }

        // 规则4: 收集率异常高（>80%，可能作弊）
        if (metrics.collectRate > 0.8) {
            score += 25;
            reasons.push(`Abnormally high collect rate: ${(metrics.collectRate * 100).toFixed(1)}%`);
        }

        // 规则5: 鼠标移动熵为0（可能是脚本）
        if (metrics.mouseMovementEntropy === 0) {
            score += 25;
            reasons.push('No mouse movement detected (bot?)');
        }

        // 规则6: 会话时长异常（24小时在线）
        if (metrics.sessionDuration > 20 * 60 * 60 * 1000) {
            score += 20;
            reasons.push(`Excessive session duration: ${Math.floor(metrics.sessionDuration / 3600000)}h`);
        }

        return { score, reasons, metrics };
    }

    private static async collectMetrics(userId: string): Promise<UserBehaviorMetrics> {
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // 查询24小时内的交易记录
        const transactions = await TransactionLog.collection.find({
            userId,
            createdAt: { $gte: dayAgo }
        }).toArray();

        const dropTransactions = transactions.filter(t => t.reason === 'drop_coin');
        const collectTransactions = transactions.filter(t => t.reason === 'collect_coin');

        // 计算投币频率
        const dropCoinFrequency = dropTransactions.length / (24 * 60); // 每分钟

        // 计算时间间隔方差
        const intervals = [];
        for (let i = 1; i < dropTransactions.length; i++) {
            intervals.push(dropTransactions[i].createdAt - dropTransactions[i - 1].createdAt);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length || 0;
        const dropCoinVariance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length || 0;

        // 计算收集率（需要从游戏日志获取投币位置）
        const collectRate = dropTransactions.length > 0
            ? collectTransactions.length / dropTransactions.length
            : 0;

        // TODO: 从游戏日志获取其他指标
        const dropPositionEntropy = 3.5; // 示例值
        const mouseMovementEntropy = 4.2; // 示例值
        const sessionDuration = 30 * 60 * 1000; // 示例值
        const sessionFrequency = 10; // 示例值
        const clickSpeed = 150; // 示例值
        const avgRewardPerSession = collectTransactions.reduce((sum, t) => sum + t.amount, 0) / Math.max(sessionFrequency, 1);

        return {
            dropCoinFrequency,
            dropCoinVariance,
            dropPositionEntropy,
            collectRate,
            avgRewardPerSession,
            sessionDuration,
            sessionFrequency,
            clickSpeed,
            mouseMovementEntropy
        };
    }

    /**
     * 自动封禁高风险账号
     */
    static async autoModerate(userId: string): Promise<void> {
        const result = await this.calculateFraudScore(userId);

        if (result.score >= 80) {
            // 自动封禁
            await UserDB.updateUser(userId, {
                banned: true,
                banReason: `Auto-banned: Fraud score ${result.score}`,
                banTime: Date.now()
            });

            console.error(`[Security] Auto-banned user ${userId}: ${result.reasons.join(', ')}`);
        } else if (result.score >= 60) {
            // 限制奖励
            await UserDB.updateUser(userId, {
                rewardRestricted: true,
                restrictionReason: `Suspicious behavior: ${result.reasons.join(', ')}`
            });

            console.warn(`[Security] Restricted user ${userId}: ${result.reasons.join(', ')}`);
        } else if (result.score >= 30) {
            // 仅记录
            await AuditQueue.add({
                userId,
                type: 'suspicious_behavior',
                score: result.score,
                reasons: result.reasons
            });
        }
    }
}

// 定期检测（Cron Job）
setInterval(async () => {
    // 获取今日活跃用户
    const activeUsers = await UserDB.getActiveUsers(24 * 60 * 60 * 1000);

    for (const userId of activeUsers) {
        await FraudDetectionEngine.autoModerate(userId);
    }
}, 5 * 60 * 1000); // 每5分钟检测一次
```

**机器学习增强版**（可选）:
```python
# fraud_detection_ml/train.py
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# 训练数据（人工标注的作弊/正常用户）
data = pd.read_csv('user_behaviors.csv')
X = data[['drop_frequency', 'variance', 'collect_rate', 'entropy']]
y = data['is_fraud']

# 训练模型
model = RandomForestClassifier(n_estimators=100)
model.fit(X, y)

# 导出模型
import joblib
joblib.dump(model, 'fraud_model.pkl')

# Node.js调用（通过HTTP服务）
# POST /predict
# {"metrics": {...}}
# => {"fraud_probability": 0.85}
```

---

### 4. TLS/SSL 加密（内部服务通信）

**问题**: 内部服务间明文通信，易被中间人攻击

**方案**: mTLS（双向TLS）

```typescript
// tsrpc_server/src/server/room/RustRoomClient.ts

import * as tls from 'tls';
import * as fs from 'fs';

export class SecureRustRoomClient extends RustRoomClient {
    protected createConnection(): void {
        const options: tls.ConnectionOptions = {
            host: this.host,
            port: this.port,

            // 客户端证书（mTLS）
            key: fs.readFileSync(process.env.TLS_CLIENT_KEY_PATH!),
            cert: fs.readFileSync(process.env.TLS_CLIENT_CERT_PATH!),

            // 服务器CA证书
            ca: fs.readFileSync(process.env.TLS_CA_CERT_PATH!),

            // 严格验证
            rejectUnauthorized: true,
            checkServerIdentity: (hostname, cert) => {
                // 自定义验证逻辑
                return undefined; // 验证通过
            }
        };

        this.socket = tls.connect(options, () => {
            console.log('[SecureRustRoomClient] TLS connection established');
            console.log('  Protocol:', (this.socket as tls.TLSSocket).getProtocol());
            console.log('  Cipher:', (this.socket as tls.TLSSocket).getCipher());
        });

        // ... 其他逻辑
    }
}

// Rust端（room-service/src/net.rs）
use tokio_rustls::{TlsAcceptor, rustls};
use std::fs::File;
use std::io::BufReader;

async fn start_tls_server() -> Result<(), Box<dyn std::error::Error>> {
    // 加载证书
    let cert_file = File::open("certs/server.crt")?;
    let key_file = File::open("certs/server.key")?;

    let certs = rustls_pemfile::certs(&mut BufReader::new(cert_file))?
        .into_iter()
        .map(rustls::Certificate)
        .collect();

    let keys = rustls_pemfile::pkcs8_private_keys(&mut BufReader::new(key_file))?
        .into_iter()
        .map(rustls::PrivateKey)
        .collect::<Vec<_>>();

    // 配置TLS
    let mut config = rustls::ServerConfig::builder()
        .with_safe_defaults()
        .with_no_client_auth()
        .with_single_cert(certs, keys[0].clone())?;

    // 启用mTLS（可选）
    config.client_cert_verifier = Arc::new(AllowAnyAuthenticatedClient::new(root_store));

    let acceptor = TlsAcceptor::from(Arc::new(config));

    // 监听TLS连接
    let listener = tokio::net::TcpListener::bind("0.0.0.0:4000").await?;

    loop {
        let (stream, addr) = listener.accept().await?;
        let acceptor = acceptor.clone();

        tokio::spawn(async move {
            match acceptor.accept(stream).await {
                Ok(tls_stream) => {
                    println!("TLS connection from {}", addr);
                    // 处理连接
                },
                Err(e) => eprintln!("TLS error: {}", e)
            }
        });
    }
}
```

**证书生成**:
```bash
# 生成CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt

# 生成服务器证书
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365

# 生成客户端证书（mTLS）
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 365
```

---

### 5. 数据库字段加密

**问题**: 敏感数据（钱包地址、手机号）明文存储

**方案**: 字段级加密

```typescript
// tsrpc_server/src/server/utils/Encryption.ts

import crypto from 'crypto';

export class FieldEncryption {
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static readonly KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32字节密钥

    /**
     * 加密字段
     */
    static encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // 格式: iv:authTag:ciphertext
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    /**
     * 解密字段
     */
    static decrypt(ciphertext: string): string {
        const parts = ciphertext.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid ciphertext format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

// 使用示例（UserDB）
export interface User {
    userId: string;
    username: string;
    gold: number;

    // 敏感字段（加密存储）
    email_encrypted?: string;
    phone_encrypted?: string;
    walletAddress_encrypted?: string;
}

class UserDB {
    static async createUser(data: {
        username: string;
        email?: string;
        phone?: string;
        walletAddress?: string;
    }): Promise<User> {
        const user: User = {
            userId: generateUserId(),
            username: data.username,
            gold: 0,
        };

        // 加密敏感字段
        if (data.email) {
            user.email_encrypted = FieldEncryption.encrypt(data.email);
        }
        if (data.phone) {
            user.phone_encrypted = FieldEncryption.encrypt(data.phone);
        }
        if (data.walletAddress) {
            user.walletAddress_encrypted = FieldEncryption.encrypt(data.walletAddress);
        }

        await this.collection.insertOne(user);
        return user;
    }

    static async getUserWithDecryption(userId: string): Promise<User & {
        email?: string;
        phone?: string;
        walletAddress?: string;
    }> {
        const user = await this.collection.findOne({ userId });
        if (!user) throw new Error('User not found');

        // 解密敏感字段
        const decrypted: any = { ...user };
        if (user.email_encrypted) {
            decrypted.email = FieldEncryption.decrypt(user.email_encrypted);
        }
        if (user.phone_encrypted) {
            decrypted.phone = FieldEncryption.decrypt(user.phone_encrypted);
        }
        if (user.walletAddress_encrypted) {
            decrypted.walletAddress = FieldEncryption.decrypt(user.walletAddress_encrypted);
        }

        return decrypted;
    }
}
```

**密钥管理**（推荐使用KMS）:
```bash
# 本地开发
openssl rand -hex 32 > encryption.key

# 生产环境（AWS KMS）
aws kms create-key --description "Field encryption key"
aws kms generate-data-key --key-id <key-id> --key-spec AES_256

# 或Google Cloud KMS
gcloud kms keys create field-encryption \
  --location global \
  --keyring app-keys \
  --purpose encryption
```

---

### 6. 实时监控告警（Prometheus + Grafana）

**问题**: 无法实时发现异常

**方案**: 完整监控体系

```typescript
// tsrpc_server/src/server/utils/Metrics.ts

import { register, Counter, Histogram, Gauge } from 'prom-client';

// 业务指标
export const metrics = {
    // 投币相关
    dropCoinTotal: new Counter({
        name: 'drop_coin_total',
        help: 'Total drop coin requests',
        labelNames: ['userId', 'success', 'reason']
    }),

    dropCoinDuration: new Histogram({
        name: 'drop_coin_duration_seconds',
        help: 'Drop coin request duration',
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    }),

    // 奖励相关
    rewardTotal: new Counter({
        name: 'reward_total',
        help: 'Total rewards given',
        labelNames: ['userId']
    }),

    rewardAmount: new Counter({
        name: 'reward_amount_total',
        help: 'Total reward amount',
    }),

    dailyLimitHits: new Counter({
        name: 'daily_limit_hits_total',
        help: 'Daily reward limit hits',
        labelNames: ['userId']
    }),

    // 安全相关
    rateLimitHits: new Counter({
        name: 'rate_limit_hits_total',
        help: 'Rate limit violations',
        labelNames: ['limiter', 'userId']
    }),

    fraudScores: new Histogram({
        name: 'fraud_score',
        help: 'Fraud detection scores',
        labelNames: ['userId'],
        buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    }),

    bannedUsers: new Gauge({
        name: 'banned_users_total',
        help: 'Total number of banned users'
    }),

    // 系统指标
    activeRooms: new Gauge({
        name: 'active_rooms',
        help: 'Number of active game rooms'
    }),

    activeUsers: new Gauge({
        name: 'active_users',
        help: 'Number of active users'
    }),
};

// 暴露指标端点
import express from 'express';
const metricsApp = express();

metricsApp.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

metricsApp.listen(9090, () => {
    console.log('Metrics server listening on :9090');
});

// 在ApiDropCoin中使用
async function ApiDropCoin(call: ApiCall<ReqDropCoin, ResDropCoin>) {
    const start = Date.now();

    try {
        // ... 业务逻辑

        metrics.dropCoinTotal.inc({ userId, success: 'true', reason: 'normal' });
        metrics.dropCoinDuration.observe((Date.now() - start) / 1000);

        call.succ({ coinId });
    } catch (err) {
        metrics.dropCoinTotal.inc({ userId, success: 'false', reason: err.message });
        call.error(err.message);
    }
}
```

**Prometheus配置** (prometheus.yml):
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# 告警规则
rule_files:
  - 'alerts.yml'

# 抓取目标
scrape_configs:
  - job_name: 'gate-server'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'room-server'
    static_configs:
      - targets: ['localhost:9091']

# Alertmanager配置
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

**告警规则** (alerts.yml):
```yaml
groups:
  - name: security
    interval: 30s
    rules:
      # 高频投币告警
      - alert: HighDropCoinRate
        expr: rate(drop_coin_total[1m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High drop coin rate detected"
          description: "{{ $labels.userId }} is dropping coins at {{ $value }}/min"

      # 欺诈评分告警
      - alert: HighFraudScore
        expr: fraud_score > 70
        labels:
          severity: critical
        annotations:
          summary: "High fraud score detected"
          description: "User {{ $labels.userId }} has fraud score {{ $value }}"

      # 每日限额触发率异常
      - alert: HighDailyLimitHitRate
        expr: rate(daily_limit_hits_total[1h]) > 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Many users hitting daily limit"
          description: "{{ $value }} users/hour hitting daily reward limit"

      # 大量封禁
      - alert: MassBanDetected
        expr: increase(banned_users_total[5m]) > 10
        labels:
          severity: critical
        annotations:
          summary: "Mass ban detected"
          description: "{{ $value }} users banned in 5 minutes"

  - name: business
    interval: 30s
    rules:
      # 奖励发放异常
      - alert: AbnormalRewardRate
        expr: rate(reward_amount_total[5m]) > 10000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Abnormal reward payout rate"
          description: "Paying out {{ $value }} gold/min (normal: <1000)"

      # 活跃用户骤降
      - alert: UserDropOff
        expr: (active_users - active_users offset 1h) / active_users offset 1h < -0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Active users dropped significantly"
          description: "Active users dropped by {{ $value }}%"
```

**Grafana面板**:
```json
{
  "dashboard": {
    "title": "Security Dashboard",
    "panels": [
      {
        "title": "Drop Coin Rate",
        "targets": [
          {
            "expr": "rate(drop_coin_total[1m])"
          }
        ]
      },
      {
        "title": "Fraud Score Distribution",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, fraud_score)"
          }
        ]
      },
      {
        "title": "Daily Limit Hits",
        "targets": [
          {
            "expr": "increase(daily_limit_hits_total[1h])"
          }
        ]
      },
      {
        "title": "Banned Users",
        "targets": [
          {
            "expr": "banned_users_total"
          }
        ]
      }
    ]
  }
}
```

---

## 🟡 P1 级别：强烈建议（1-3个月内）

### 7. Web3钱包安全

**签名验证**:
```typescript
import { ethers } from 'ethers';

async function verifyWalletOwnership(
    walletAddress: string,
    signature: string,
    message: string
): Promise<boolean> {
    try {
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (err) {
        return false;
    }
}

// 防止签名重放
const messageTemplate = (nonce: string) =>
    `Sign this message to verify your wallet ownership.\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
```

**智能合约调用限流**:
```typescript
// 防止合约调用滥用
const contractCallLimiter = new RedisRateLimiter(redis, 'contract_call');

async function safeMintNFT(userId: string, ...args) {
    const check = await contractCallLimiter.checkAndIncrement(userId, 10, 3600000); // 10次/小时
    if (!check.allowed) {
        throw new Error('Contract call rate limit exceeded');
    }

    // 调用合约
    await nftContract.mint(...args);
}
```

### 8. API网关（统一鉴权）

```typescript
// nginx.conf
http {
    # 限流
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

    # DDoS防护
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    server {
        listen 443 ssl;

        # WAF规则
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            limit_conn conn_limit 10;

            # 过滤恶意请求
            if ($http_user_agent ~* (bot|crawler|scraper)) {
                return 403;
            }

            proxy_pass http://backend;
        }
    }
}
```

### 9. 会话管理增强

```typescript
// JWT刷新机制
interface TokenPair {
    accessToken: string;  // 15分钟
    refreshToken: string; // 7天
}

async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);

    // 检查是否被撤销
    const isRevoked = await redis.get(`revoked:${refreshToken}`);
    if (isRevoked) {
        throw new Error('Token revoked');
    }

    // 颁发新token
    return generateTokenPair(payload.userId);
}
```

---

## 🟢 P2 级别：优化项（3-6个月）

### 10. 物理引擎反作弊增强

```rust
// room-service/src/room/physics.rs

// 检测异常物理状态
impl PhysicsWorld {
    fn detect_anomalies(&self) -> Vec<Anomaly> {
        let mut anomalies = Vec::new();

        for (id, body) in &self.coin_bodies {
            let velocity = body.linvel();

            // 异常高速
            if velocity.magnitude() > 50.0 {
                anomalies.push(Anomaly::ExcessiveSpeed {
                    coin_id: *id,
                    speed: velocity.magnitude()
                });
            }

            // 穿透检测
            let position = body.translation();
            if position.y < -100.0 {
                anomalies.push(Anomaly::OutOfBounds {
                    coin_id: *id,
                    position: *position
                });
            }
        }

        anomalies
    }
}
```

### 11. 经济模型深度优化

**动态RTP**:
```typescript
// 根据玩家投入调整回报率
class DynamicRTPController {
    static calculateRTP(userId: string): number {
        const userStats = await getUserLifetimeStats(userId);

        // 新用户：95% RTP（吸引留存）
        if (userStats.totalDrops < 100) {
            return 0.95;
        }

        // 老用户：85% RTP（维持利润）
        if (userStats.totalDrops > 10000) {
            return 0.85;
        }

        // 线性衰减
        return 0.95 - (userStats.totalDrops / 10000) * 0.1;
    }
}
```

### 12. 合规性（GDPR/反洗钱）

```typescript
// GDPR: 数据导出
async function exportUserData(userId: string): Promise<UserDataExport> {
    return {
        profile: await UserDB.getUserById(userId),
        transactions: await TransactionLog.getUserHistory(userId),
        gameHistory: await GameHistoryDB.getAll(userId),
        // ... 所有个人数据
    };
}

// GDPR: 删除权
async function deleteUserData(userId: string): Promise<void> {
    // 匿名化而非删除（保留交易记录）
    await UserDB.anonymizeUser(userId);
    await TransactionLog.anonymizeUser(userId);
}

// 反洗钱: 大额交易监控
async function detectMoneyLaundering(userId: string): Promise<boolean> {
    const last24h = await TransactionLog.getUserHistory(userId, 100);
    const totalIn = last24h.filter(t => t.type === 'add').reduce((sum, t) => sum + t.amount, 0);
    const totalOut = last24h.filter(t => t.type === 'deduct').reduce((sum, t) => sum + t.amount, 0);

    // 大额快进快出
    if (totalIn > 10000 && totalOut > 9000 && last24h.length > 50) {
        return true;
    }

    return false;
}
```

---

## 📊 完整安全架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 设备指纹收集  │  │ 行为埋点      │  │ 签名生成      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS + TLS 1.3
┌────────────────────────▼────────────────────────────────────┐
│                     API网关 (Nginx)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ WAF          │  │ DDoS防护      │  │ 限流          │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
┌─────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐
│ Gate Server│  │  Room Server    │  │Match Server│
│            │  │                 │  │            │
│ 🔒签名验证  │  │ 🔒投币冷却       │  │            │
│ 🔒设备指纹  │  │ 🔒行为分析       │  │            │
│ 🔒每日限额  │  │                 │  │            │
└─────┬──────┘  └────────┬────────┘  └─────┬──────┘
      │                  │                  │
      └──────────────────┼──────────────────┘
                         │ mTLS
┌────────────────────────▼────────────────────────────────────┐
│                    Rust Room Service                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 物理引擎验证  │  │ 异常检测      │  │ 服务器权威    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
┌─────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐
│  MongoDB   │  │     Redis       │  │ Prometheus │
│            │  │                 │  │            │
│ 🔒字段加密  │  │ 🔒分布式限流     │  │ 🔒实时监控  │
│ 🔒审计日志  │  │ 🔒会话管理       │  │            │
└────────────┘  └─────────────────┘  └────────────┘
```

---

## 💰 成本估算（月度）

| 组件 | 配置 | 成本 | 备注 |
|------|------|------|------|
| Redis (ElastiCache) | 2 节点 cache.m5.large | $150 | 分布式限流 |
| Prometheus + Grafana | 4C8G VM | $80 | 监控告警 |
| TLS证书 (Let's Encrypt) | 免费 | $0 | 自动续期 |
| KMS密钥管理 | AWS KMS | $10 | 字段加密 |
| Cloudflare Pro | CDN + WAF | $20 | DDoS防护 |
| **总计** | | **$260/月** | |

---

## 🚀 实施路线图

### Week 1-2: P0.1 (Redis限流)
- [ ] 部署Redis集群
- [ ] 迁移限流逻辑到Redis
- [ ] 测试分布式场景

### Week 3-4: P0.2 (设备指纹)
- [ ] 客户端指纹收集
- [ ] 服务器关联分析
- [ ] 可疑账号告警

### Week 5-6: P0.3 (行为分析)
- [ ] 实现欺诈评分引擎
- [ ] 定时检测Cron
- [ ] 自动封禁机制

### Month 2: P0.4-6 (加密+监控)
- [ ] TLS配置
- [ ] 字段加密
- [ ] Prometheus部署
- [ ] Grafana面板

### Month 3+: P1/P2
- [ ] Web3安全增强
- [ ] API网关
- [ ] 经济模型优化
- [ ] 合规性支持

---

**需要我深入设计某个具体模块的代码吗？比如Redis限流器的完整实现？**
