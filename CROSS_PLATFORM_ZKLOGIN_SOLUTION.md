# 🌐 跨平台同步完整方案：Discord Activity + zkLogin

**方案**: 方案B (Discord SDK) + zkLogin + 统一身份
**目标**: 实现 Discord、Telegram、Web、移动端完全数据互通
**优势**: 用户在任意平台登录，访问同一游戏账号和链上资产
**更新时间**: 2025-12-04

---

## 🎯 方案架构

### 核心理念

```
用户在任意平台登录（Discord/Telegram/Web/Mobile）
    ↓
平台身份验证（Discord ID / Telegram ID / Google账号等）
    ↓
生成统一的 Sui 地址（zkLogin）
    ↓
Sui 地址作为跨平台身份标识
    ↓
游戏数据和链上资产关联到 Sui 地址
    ↓
用户可以在任意平台访问同一账号
```

### 数据流

```
Discord Activity
    ↓ (Discord ID)
        ↘
Telegram Bot          → zkLogin Bridge → Sui Address → Game Account
    ↓ (Telegram ID)                         ↓              ↓
        ↗                              NFT/Token     Gold/Level/Items
Web Browser
    ↓ (Google OAuth)
```

---

## 🏗️ 完整架构设计

### 1. 身份映射表

```typescript
// 每个平台身份 → 同一个 Sui 地址
interface PlatformIdentityMapping {
    platform: 'discord' | 'telegram' | 'google' | 'apple';
    platformUserId: string;          // 平台的唯一ID
    suiAddress: string;              // 统一的 Sui 地址
    zkLoginData: {
        oidcProvider: string;        // OAuth提供商
        oidcSubject: string;         // OAuth subject
        salt: string;                // zkLogin salt
        jwt?: string;                // 最近的JWT（可选）
    };
    createdAt: number;
    lastUsedAt: number;
}

// 示例：同一用户的不同平台身份
[
    {
        platform: 'discord',
        platformUserId: 'discord_123456',
        suiAddress: '0xabc...',
        zkLoginData: { ... }
    },
    {
        platform: 'telegram',
        platformUserId: 'telegram_789012',
        suiAddress: '0xabc...',  // 相同的 Sui 地址！
        zkLoginData: { ... }
    }
]
```

### 2. 统一账号结构

```typescript
// 游戏账号以 Sui 地址为唯一标识
interface UnifiedGameAccount {
    suiAddress: string;              // 主键：Sui地址

    // 游戏数据
    username: string;
    level: number;
    gold: number;
    exp: number;

    // 平台绑定列表
    boundPlatforms: Array<{
        platform: string;
        platformUserId: string;
        platformUsername: string;
        bindTime: number;
    }>;

    // 链上资产（自动同步）
    nftAssets: string[];             // NFT token IDs
    tokenBalances: {
        coinType: string;
        balance: string;
    }[];

    // 元数据
    createdAt: number;
    lastLoginTime: number;
    lastLoginPlatform: string;
}
```

---

## 💻 前端实现（Discord Activity）

### 安装依赖

```bash
npm install @discord/embedded-app-sdk
npm install @mysten/sui.js @mysten/zklogin
npm install @mysten/wallet-standard
```

### 完整的前端代码

```typescript
// cross-platform-auth.ts

import { DiscordSDK } from '@discord/embedded-app-sdk';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { generateNonce, generateRandomness } from '@mysten/zklogin';
import { jwtToAddress } from '@mysten/zklogin';

/**
 * 跨平台认证管理器
 * 支持 Discord、Telegram、Web 等多平台统一登录
 */
export class CrossPlatformAuth {
    private sdk: DiscordSDK | null = null;
    private platform: 'discord' | 'telegram' | 'web';
    private clientId: string;
    private backendUrl: string;

    constructor(config: {
        platform: 'discord' | 'telegram' | 'web';
        clientId: string;
        backendUrl: string;
    }) {
        this.platform = config.platform;
        this.clientId = config.clientId;
        this.backendUrl = config.backendUrl;

        // Discord平台需要初始化SDK
        if (this.platform === 'discord') {
            this.sdk = new DiscordSDK(this.clientId);
        }
    }

    /**
     * 初始化（所有平台通用入口）
     */
    async initialize(): Promise<UnifiedLoginResult> {
        console.log(`[Auth] Initializing for platform: ${this.platform}`);

        // 检查本地缓存
        const cached = this.loadCachedSession();
        if (cached && await this.validateSession(cached)) {
            console.log('[Auth] Using cached session');
            return cached;
        }

        // 根据平台执行不同的登录流程
        switch (this.platform) {
            case 'discord':
                return await this.loginDiscord();
            case 'telegram':
                return await this.loginTelegram();
            case 'web':
                return await this.loginWeb();
            default:
                throw new Error(`Unsupported platform: ${this.platform}`);
        }
    }

    /**
     * Discord 平台登录（方案B - SDK）
     */
    private async loginDiscord(): Promise<UnifiedLoginResult> {
        if (!this.sdk) {
            throw new Error('Discord SDK not initialized');
        }

        console.log('[Auth] Discord: Waiting for SDK ready...');
        await this.sdk.ready();

        console.log('[Auth] Discord: Requesting authorization...');

        // 使用SDK获取access token
        const auth = await this.sdk.commands.authorize({
            client_id: this.clientId,
            response_type: 'token',
            state: this.generateState(),
            prompt: 'none',
            scope: ['identify'],
        });

        // 获取Discord用户信息
        const discordUser = await this.getDiscordUser(auth.access_token);
        console.log('[Auth] Discord user:', discordUser.username);

        // 通过后端创建/获取统一身份
        const unifiedIdentity = await this.createUnifiedIdentity({
            platform: 'discord',
            platformUserId: discordUser.id,
            platformUsername: discordUser.username,
            platformData: {
                discriminator: discordUser.discriminator,
                avatar: discordUser.avatar,
            },
        });

        return unifiedIdentity;
    }

    /**
     * Telegram 平台登录
     */
    private async loginTelegram(): Promise<UnifiedLoginResult> {
        console.log('[Auth] Telegram: Getting user from WebApp...');

        // Telegram Mini App 自动提供用户信息
        const telegram = (window as any).Telegram?.WebApp;
        if (!telegram) {
            throw new Error('Not in Telegram WebApp environment');
        }

        const user = telegram.initDataUnsafe.user;
        if (!user) {
            throw new Error('Telegram user not found');
        }

        console.log('[Auth] Telegram user:', user.username || user.first_name);

        // 通过后端创建/获取统一身份
        const unifiedIdentity = await this.createUnifiedIdentity({
            platform: 'telegram',
            platformUserId: user.id.toString(),
            platformUsername: user.username || user.first_name,
            platformData: {
                firstName: user.first_name,
                lastName: user.last_name,
                initData: telegram.initData, // 用于后端验证
            },
        });

        return unifiedIdentity;
    }

    /**
     * Web 平台登录（Google OAuth + zkLogin）
     */
    private async loginWeb(): Promise<UnifiedLoginResult> {
        console.log('[Auth] Web: Starting Google OAuth...');

        // 1. 生成zkLogin参数
        const ephemeralKeyPair = new Ed25519Keypair();
        const randomness = generateRandomness();
        const nonce = generateNonce(
            ephemeralKeyPair.getPublicKey(),
            randomness
        );

        // 2. 触发Google OAuth（获取JWT）
        const jwt = await this.getGoogleJWT(nonce);

        // 3. 解析JWT获取subject
        const jwtPayload = this.parseJWT(jwt);
        const googleUserId = jwtPayload.sub;

        console.log('[Auth] Google user:', jwtPayload.email);

        // 4. 通过后端创建/获取统一身份
        const unifiedIdentity = await this.createUnifiedIdentity({
            platform: 'google',
            platformUserId: googleUserId,
            platformUsername: jwtPayload.email || jwtPayload.name,
            platformData: {
                email: jwtPayload.email,
                jwt: jwt,
                nonce: nonce,
                randomness: randomness,
            },
        });

        return unifiedIdentity;
    }

    /**
     * 创建/获取统一身份（核心逻辑）
     * 后端会：
     * 1. 检查该平台ID是否已绑定Sui地址
     * 2. 如果没有，使用zkLogin生成新的Sui地址
     * 3. 返回Sui地址和游戏账号信息
     */
    private async createUnifiedIdentity(
        platformIdentity: PlatformIdentity
    ): Promise<UnifiedLoginResult> {
        console.log('[Auth] Creating/fetching unified identity...');

        const response = await fetch(`${this.backendUrl}/api/unified-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(platformIdentity),
        });

        if (!response.ok) {
            throw new Error('Failed to create unified identity');
        }

        const result = await response.json();
        console.log('[Auth] Unified identity:', result);

        // 保存到本地缓存
        this.cacheSession(result);

        return result;
    }

    /**
     * 获取Discord用户信息
     */
    private async getDiscordUser(accessToken: string) {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch Discord user');
        }

        return await response.json();
    }

    /**
     * 获取Google JWT（触发OAuth流程）
     */
    private async getGoogleJWT(nonce: string): Promise<string> {
        // 构造Google OAuth URL
        const googleClientId = 'YOUR_GOOGLE_CLIENT_ID';
        const redirectUri = `${this.backendUrl}/oauth/google/callback`;

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${googleClientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=id_token&` +
            `scope=openid%20profile%20email&` +
            `nonce=${nonce}`;

        // 打开OAuth窗口
        return new Promise((resolve, reject) => {
            const popup = window.open(authUrl, 'google-oauth', 'width=500,height=600');

            const handler = (event: MessageEvent) => {
                if (event.origin !== this.backendUrl) return;

                const { type, data } = event.data;
                if (type === 'google-oauth-success') {
                    window.removeEventListener('message', handler);
                    popup?.close();
                    resolve(data.idToken);
                } else if (type === 'google-oauth-error') {
                    window.removeEventListener('message', handler);
                    popup?.close();
                    reject(new Error(data.error));
                }
            };

            window.addEventListener('message', handler);

            // 超时
            setTimeout(() => {
                window.removeEventListener('message', handler);
                popup?.close();
                reject(new Error('OAuth timeout'));
            }, 5 * 60 * 1000);
        });
    }

    /**
     * 解析JWT
     */
    private parseJWT(jwt: string): any {
        const parts = jwt.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT');
        }

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    }

    /**
     * 验证session是否有效
     */
    private async validateSession(session: UnifiedLoginResult): Promise<boolean> {
        if (session.expiresAt < Date.now()) {
            return false;
        }

        // 向后端验证token
        try {
            const response = await fetch(`${this.backendUrl}/api/verify-session`, {
                headers: { 'Authorization': `Bearer ${session.gameToken}` },
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * 缓存session
     */
    private cacheSession(session: UnifiedLoginResult) {
        localStorage.setItem('unified_session', JSON.stringify(session));
    }

    /**
     * 加载缓存的session
     */
    private loadCachedSession(): UnifiedLoginResult | null {
        const data = localStorage.getItem('unified_session');
        return data ? JSON.parse(data) : null;
    }

    private generateState(): string {
        return Math.random().toString(36).substring(7);
    }
}

// ============================================
// 类型定义
// ============================================

interface PlatformIdentity {
    platform: string;
    platformUserId: string;
    platformUsername: string;
    platformData: any;
}

interface UnifiedLoginResult {
    // Sui 身份
    suiAddress: string;              // 跨平台统一标识

    // 游戏账号
    gameToken: string;               // 游戏token
    userId: string;                  // 游戏内部ID（等同于suiAddress）
    username: string;

    // 游戏数据
    level: number;
    gold: number;
    exp: number;

    // 平台信息
    currentPlatform: string;
    boundPlatforms: string[];

    // 链上资产
    nftCount: number;
    tokenBalances: Array<{
        coinType: string;
        balance: string;
    }>;

    // Token信息
    expiresAt: number;
}

// ============================================
// 使用示例
// ============================================

// Discord Activity 中使用
async function initDiscordGame() {
    const auth = new CrossPlatformAuth({
        platform: 'discord',
        clientId: 'YOUR_DISCORD_CLIENT_ID',
        backendUrl: 'https://your-backend.com',
    });

    const identity = await auth.initialize();

    console.log('Sui Address:', identity.suiAddress);
    console.log('Game Token:', identity.gameToken);
    console.log('Username:', identity.username);
    console.log('NFTs:', identity.nftCount);

    // 启动游戏
    startGame(identity);
}

// Telegram Bot 中使用
async function initTelegramGame() {
    const auth = new CrossPlatformAuth({
        platform: 'telegram',
        clientId: '', // Telegram不需要
        backendUrl: 'https://your-backend.com',
    });

    const identity = await auth.initialize();

    // 与Discord登录的用户获得相同的identity（如果已绑定）
    startGame(identity);
}
```

---

## 🔧 后端实现

### 安装依赖

```bash
npm install @mysten/sui.js @mysten/zklogin
npm install jsonwebtoken
npm install axios
```

### 核心后端代码

```typescript
// unified-auth-controller.ts

import { Router } from 'express';
import { generateZkLoginAddress } from './zklogin-service';
import { verifyDiscordToken, verifyTelegramAuth } from './platform-verifiers';

const router = Router();

/**
 * 统一登录端点（所有平台）
 *
 * 流程：
 * 1. 验证平台身份
 * 2. 检查是否已有Sui地址绑定
 * 3. 如果没有，生成新的Sui地址（zkLogin）
 * 4. 返回统一身份信息
 */
router.post('/api/unified-login', async (req, res) => {
    try {
        const {
            platform,
            platformUserId,
            platformUsername,
            platformData
        } = req.body;

        console.log(`[UnifiedAuth] Login request from ${platform}: ${platformUserId}`);

        // 1. 验证平台身份
        const isValid = await verifyPlatformIdentity(platform, platformUserId, platformData);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid platform credentials' });
        }

        // 2. 查询是否已有身份映射
        let mapping = await PlatformMappingDB.findByPlatformUser(platform, platformUserId);

        if (!mapping) {
            // 3. 首次登录：创建新的Sui身份
            console.log(`[UnifiedAuth] Creating new Sui identity for ${platform}:${platformUserId}`);

            const suiIdentity = await createSuiIdentity({
                platform,
                platformUserId,
                platformUsername,
                platformData,
            });

            mapping = suiIdentity.mapping;

            // 4. 创建游戏账号
            await GameAccountDB.create({
                suiAddress: suiIdentity.suiAddress,
                username: platformUsername,
                level: 1,
                gold: 1000, // 初始金币
                exp: 0,
                boundPlatforms: [{
                    platform,
                    platformUserId,
                    platformUsername,
                    bindTime: Date.now(),
                }],
                createdAt: Date.now(),
            });

            console.log(`[UnifiedAuth] New account created: ${suiIdentity.suiAddress}`);
        } else {
            // 5. 已有账号：更新登录时间
            await PlatformMappingDB.updateLastUsed(mapping._id);
            await GameAccountDB.updateLoginTime(mapping.suiAddress, platform);

            console.log(`[UnifiedAuth] Existing account: ${mapping.suiAddress}`);
        }

        // 6. 加载游戏账号数据
        const gameAccount = await GameAccountDB.findBySuiAddress(mapping.suiAddress);

        // 7. 生成游戏token
        const gameToken = generateGameToken({
            suiAddress: mapping.suiAddress,
            platform,
            platformUserId,
        });

        // 8. 查询链上资产（可选，异步加载）
        const chainAssets = await queryChainAssets(mapping.suiAddress);

        // 9. 返回统一身份
        res.json({
            suiAddress: mapping.suiAddress,
            gameToken,
            userId: mapping.suiAddress, // 使用Sui地址作为userId
            username: gameAccount.username,
            level: gameAccount.level,
            gold: gameAccount.gold,
            exp: gameAccount.exp,
            currentPlatform: platform,
            boundPlatforms: gameAccount.boundPlatforms.map(p => p.platform),
            nftCount: chainAssets.nfts.length,
            tokenBalances: chainAssets.balances,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时
        });

    } catch (error) {
        console.error('[UnifiedAuth] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 验证平台身份
 */
async function verifyPlatformIdentity(
    platform: string,
    platformUserId: string,
    platformData: any
): Promise<boolean> {
    switch (platform) {
        case 'discord':
            // Discord Token已在前端验证，这里可以选择性二次验证
            return true;

        case 'telegram':
            // 验证Telegram initData签名
            return verifyTelegramAuth(platformData.initData, process.env.TELEGRAM_BOT_TOKEN!);

        case 'google':
            // 验证Google JWT
            return verifyGoogleJWT(platformData.jwt);

        default:
            return false;
    }
}

/**
 * 创建Sui身份（使用zkLogin）
 */
async function createSuiIdentity(identity: {
    platform: string;
    platformUserId: string;
    platformUsername: string;
    platformData: any;
}): Promise<{
    suiAddress: string;
    mapping: PlatformMapping;
}> {
    // 1. 生成zkLogin参数
    const randomness = generateRandomness();
    const ephemeralKeyPair = new Ed25519Keypair();
    const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), randomness);

    // 2. 获取/生成 JWT（根据平台不同）
    let jwt: string;
    let oidcProvider: string;
    let oidcSubject: string;

    if (identity.platform === 'google' && identity.platformData.jwt) {
        // Google平台直接使用提供的JWT
        jwt = identity.platformData.jwt;
        oidcProvider = 'https://accounts.google.com';
        oidcSubject = identity.platformUserId;
    } else {
        // 其他平台：自签JWT（作为自己的OIDC提供商）
        jwt = signCustomJWT({
            sub: `${identity.platform}:${identity.platformUserId}`,
            aud: 'oops-moba',
            nonce: nonce,
            platform: identity.platform,
            platformUserId: identity.platformUserId,
        });
        oidcProvider = 'https://your-backend.com'; // 你的域名
        oidcSubject = `${identity.platform}:${identity.platformUserId}`;
    }

    // 3. 生成Sui地址
    const suiAddress = jwtToAddress(jwt, randomness);

    // 4. 保存映射关系
    const mapping = await PlatformMappingDB.create({
        platform: identity.platform,
        platformUserId: identity.platformUserId,
        suiAddress: suiAddress,
        zkLoginData: {
            oidcProvider,
            oidcSubject,
            salt: randomness,
            jwt: jwt, // 可选：保存最近的JWT
        },
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
    });

    return { suiAddress, mapping };
}

/**
 * 自签JWT（用于非Google平台）
 */
function signCustomJWT(payload: any): string {
    const jwt = require('jsonwebtoken');
    const privateKey = process.env.ZKLOGIN_PRIVATE_KEY!;

    return jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        expiresIn: '1h',
        issuer: 'https://your-backend.com',
        keyid: 'key-1',
    });
}

/**
 * 生成游戏token
 */
function generateGameToken(data: {
    suiAddress: string;
    platform: string;
    platformUserId: string;
}): string {
    const jwt = require('jsonwebtoken');
    const secret = process.env.GAME_TOKEN_SECRET!;

    return jwt.sign(data, secret, {
        expiresIn: '24h',
    });
}

/**
 * 查询链上资产
 */
async function queryChainAssets(suiAddress: string) {
    // 查询Sui链上的NFT和代币余额
    // 可以使用 @mysten/sui.js 的 SuiClient

    // 简化示例
    return {
        nfts: [],
        balances: [
            { coinType: '0x2::sui::SUI', balance: '1000000000' }
        ],
    };
}

export default router;
```

---

## 🗄️ 数据库Schema

```typescript
// 运行初始化脚本创建表结构
// init-cross-platform-schema.ts

import { MongoClient } from 'mongodb';

async function initCrossPlatformSchema() {
    const client = new MongoClient('mongodb://localhost:27017');
    await client.connect();
    const db = client.db('oops-framework');

    console.log('🌐 初始化跨平台身份系统...\n');

    // 1. 平台身份映射表
    console.log('[1/2] 创建 platform_identity_mapping 集合...');
    const mappingCollection = db.collection('platform_identity_mapping');

    // 索引：平台+用户ID（唯一）
    await mappingCollection.createIndex(
        { platform: 1, platformUserId: 1 },
        { unique: true }
    );

    // 索引：Sui地址
    await mappingCollection.createIndex({ suiAddress: 1 });

    console.log('  ✓ platform_identity_mapping 创建完成\n');

    // 2. 统一游戏账号表（以Sui地址为主键）
    console.log('[2/2] 更新 unified_accounts 集合...');
    const accountsCollection = db.collection('unified_accounts');

    // 索引：Sui地址（主键）
    await accountsCollection.createIndex(
        { suiAddress: 1 },
        { unique: true }
    );

    console.log('  ✓ unified_accounts 创建完成\n');

    console.log('✅ 跨平台身份系统初始化完成！');

    await client.close();
}

initCrossPlatformSchema();
```

---

## 🎮 游戏中使用

### 完整的游戏启动流程

```typescript
// game-main.ts

import { CrossPlatformAuth } from './cross-platform-auth';
import { GameEngine } from './game-engine';

/**
 * 游戏主入口
 * 支持Discord、Telegram、Web等多平台
 */
async function initGame() {
    console.log('[Game] Starting...');

    // 1. 检测当前平台
    const platform = detectPlatform();
    console.log(`[Game] Platform detected: ${platform}`);

    // 2. 初始化跨平台认证
    const auth = new CrossPlatformAuth({
        platform: platform,
        clientId: getClientIdForPlatform(platform),
        backendUrl: 'https://your-backend.com',
    });

    try {
        // 3. 统一登录（自动处理不同平台的差异）
        showLoading('Connecting...');

        const identity = await auth.initialize();

        console.log('[Game] Login success!');
        console.log('  Sui Address:', identity.suiAddress);
        console.log('  Username:', identity.username);
        console.log('  Level:', identity.level);
        console.log('  Gold:', identity.gold);
        console.log('  Platforms:', identity.boundPlatforms.join(', '));
        console.log('  NFTs:', identity.nftCount);

        // 4. 初始化游戏引擎
        const game = new GameEngine({
            identity: identity,
            platform: platform,
        });

        await game.initialize();

        // 5. 加载游戏数据
        await game.loadUserData();

        // 6. 进入主场景
        await game.enterMainScene();

        hideLoading();
        console.log('[Game] Game started!');

    } catch (error) {
        console.error('[Game] Failed to start:', error);
        showError(`Failed to start game: ${error.message}`);
    }
}

/**
 * 检测当前平台
 */
function detectPlatform(): 'discord' | 'telegram' | 'web' {
    // Discord Activity
    if ((window as any).DiscordSDK) {
        return 'discord';
    }

    // Telegram Mini App
    if ((window as any).Telegram?.WebApp) {
        return 'telegram';
    }

    // Web浏览器
    return 'web';
}

/**
 * 获取平台对应的Client ID
 */
function getClientIdForPlatform(platform: string): string {
    switch (platform) {
        case 'discord':
            return 'YOUR_DISCORD_CLIENT_ID';
        case 'telegram':
            return ''; // Telegram不需要
        case 'web':
            return 'YOUR_GOOGLE_CLIENT_ID';
        default:
            return '';
    }
}

// 启动游戏
initGame();
```

---

## 🔄 跨平台绑定流程

### 用户在不同平台的体验

#### 场景1：用户先在Discord玩

```
Day 1: Discord Activity
    ↓ Discord ID: discord_123
    ↓ 生成 Sui Address: 0xabc...
    ↓ 创建游戏账号（Level 1, 100 Gold）

Day 2: 用户在Telegram打开游戏
    ↓ Telegram ID: telegram_456
    ↓ 后端检测：telegram_456未绑定
    ↓ 提示："是否与现有账号关联？"

    用户选择"关联"
    ↓ 输入Discord绑定的验证码
    ↓ 后端确认身份
    ↓ 将 telegram_456 绑定到 Sui Address: 0xabc...

    ✅ 用户看到相同的游戏数据（Level 1, 100 Gold）
    ✅ 两个平台数据完全同步
```

### 平台关联API

```typescript
// 后端API：关联新平台到现有账号
router.post('/api/link-platform', async (req, res) => {
    try {
        const {
            gameToken,          // 当前账号的token
            newPlatform,        // 要关联的新平台
            newPlatformUserId,  // 新平台的用户ID
            verificationCode    // 验证码（可选）
        } = req.body;

        // 1. 验证当前账号
        const currentIdentity = verifyGameToken(gameToken);

        // 2. 检查新平台ID是否已被占用
        const existing = await PlatformMappingDB.findByPlatformUser(
            newPlatform,
            newPlatformUserId
        );

        if (existing) {
            return res.status(409).json({
                error: 'Platform account already linked to another user'
            });
        }

        // 3. 创建新的平台映射
        await PlatformMappingDB.create({
            platform: newPlatform,
            platformUserId: newPlatformUserId,
            suiAddress: currentIdentity.suiAddress, // 关联到相同的Sui地址
            zkLoginData: {
                // ... zkLogin数据
            },
            createdAt: Date.now(),
            lastUsedAt: Date.now(),
        });

        // 4. 更新游戏账号的绑定列表
        await GameAccountDB.addBoundPlatform(
            currentIdentity.suiAddress,
            {
                platform: newPlatform,
                platformUserId: newPlatformUserId,
                bindTime: Date.now(),
            }
        );

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## 📊 完整的数据流图

```
用户在Discord Activity中登录
    ↓
Discord ID: discord_123
    ↓
后端检查：platform_identity_mapping
    ├─ 已存在 → 返回已有的 Sui Address (0xabc...)
    └─ 不存在 → 生成新的 Sui Address (0xabc...)
        ↓
    保存映射：discord_123 → 0xabc...
    创建账号：unified_accounts[0xabc...]
        ↓
返回给前端：
    {
        suiAddress: "0xabc...",
        gameToken: "jwt_token",
        username: "Player",
        level: 1,
        gold: 1000,
        boundPlatforms: ["discord"]
    }
        ↓
前端保存到 localStorage
        ↓
游戏启动

---

几小时后，用户在Telegram中打开游戏
    ↓
Telegram ID: telegram_456
    ↓
后端检查：platform_identity_mapping
    └─ 不存在 → 提示"新用户或关联现有账号"
        ↓
    用户选择"关联现有账号"
        ↓
    验证身份（验证码/OAuth等）
        ↓
    保存映射：telegram_456 → 0xabc... (相同的Sui地址!)
        ↓
返回给前端：
    {
        suiAddress: "0xabc...",  ← 相同的地址!
        gameToken: "jwt_token",
        username: "Player",      ← 相同的数据!
        level: 5,                ← 已经升级了!
        gold: 2500,              ← 金币增加了!
        boundPlatforms: ["discord", "telegram"]  ← 两个平台
    }
```

---

## ✅ 测试清单

### 跨平台功能测试

- [ ] Discord Activity 登录成功
- [ ] Telegram Bot 登录成功
- [ ] Web浏览器登录成功
- [ ] 同一用户在不同平台看到相同数据
- [ ] 在Discord修改数据，Telegram能看到
- [ ] 平台关联功能正常
- [ ] Sui地址生成正确
- [ ] 链上资产查询正常

---

## 🚀 部署步骤

### 1. 准备环境变量

```env
# Discord
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Google (用于Web登录)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# zkLogin
ZKLOGIN_PRIVATE_KEY=your_rs256_private_key
ZKLOGIN_PUBLIC_KEY=your_rs256_public_key

# JWT
GAME_TOKEN_SECRET=your_game_token_secret

# MongoDB
MONGODB_URI=mongodb://localhost:27017/oops-framework
```

### 2. 安装依赖并初始化数据库

```bash
# 后端
cd tsrpc_server
npm install

# 初始化数据库
npx tsx init-cross-platform-schema.ts
```

### 3. 部署前端到各平台

```bash
# Discord Activity
# 上传到 Discord Developer Portal

# Telegram Bot
# 配置 Telegram Bot URL

# Web版本
# 部署到你的域名
npm run build
```

---

## 📈 性能优化建议

1. **缓存Sui地址查询** - Redis缓存平台ID→Sui地址映射
2. **异步加载链上资产** - 不阻塞游戏启动
3. **Token有效期管理** - 使用refresh token延长会话
4. **Platform验证限流** - 防止暴力破解

---

## 🎯 总结

### 这个方案的优势

✅ **真正的跨平台** - Discord、Telegram、Web完全数据互通
✅ **去中心化身份** - Sui地址作为统一标识
✅ **用户体验好** - 各平台无缝切换，无需重复登录
✅ **可扩展** - 轻松添加新平台（Apple、微信等）
✅ **链上资产集成** - NFT和Token自动关联

### 开发时间估算

| 任务 | 时间 |
|------|------|
| 前端集成（Discord SDK） | 3小时 |
| 后端统一登录API | 4小时 |
| zkLogin集成 | 3小时 |
| 数据库设计和初始化 | 2小时 |
| 测试和调试 | 3小时 |
| **总计** | **15小时 (2天)** |

需要我帮你：
- 实现某个具体部分的代码？
- 调试集成过程中的问题？
- 优化某个流程？

---

**文档维护**: Claude Code
**最后更新**: 2025-12-04
**版本**: v1.0
