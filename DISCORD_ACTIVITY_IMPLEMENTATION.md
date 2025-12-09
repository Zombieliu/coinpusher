# 🎮 Discord Activity + zkLogin 完整实现方案

**项目**: OOPS-MOBA Discord Activity
**目标**: 在 Discord 内嵌H5游戏，集成 zkLogin 身份验证
**更新时间**: 2025-12-04

---

## 📚 目录

1. [架构总览](#架构总览)
2. [方案 A: OAuth Popup 完整流程](#方案-a-oauth-popup-完整流程)
3. [方案 B: Embedded SDK 快速获取](#方案-b-embedded-sdk-快速获取)
4. [zkLogin 集成](#zklogin-集成)
5. [完整代码实现](#完整代码实现)
6. [部署配置](#部署配置)

---

## 🏗️ 架构总览

### 技术栈

```
Discord Client
    └── Discord Activity (iframe)
        ├── Embedded App SDK (@discord/embedded-app-sdk)
        ├── 前端游戏 (Cocos Creator H5)
        └── OAuth Handler
            ↓
        Gate Server (Node.js)
            ├── Discord OAuth 验证
            ├── zkLogin ID Token 签发
            └── Sui Address 生成
```

### 两种登录方案对比

| 特性 | 方案A: OAuth Popup | 方案B: SDK Helper |
|------|-------------------|-------------------|
| **实现难度** | 中等 | 简单 |
| **Token类型** | 长期 refresh_token | 短期 access_token |
| **权限范围** | 可自定义 scope | SDK预设 |
| **后端依赖** | 需要OAuth回调端点 | 可选 |
| **适用场景** | 需要邮箱/完整信息 | 只需身份标识 |
| **推荐度** | ⭐⭐⭐⭐ (功能完整) | ⭐⭐⭐⭐⭐ (快速启动) |

**建议**: 先实现方案B快速上线，需要时再加方案A的完整OAuth

---

## 🚀 方案 A: OAuth Popup 完整流程

### A.1 前端实现 (Activity iframe)

#### 安装依赖

```bash
npm install @discord/embedded-app-sdk
```

#### Discord OAuth Handler

```typescript
// discord-oauth-handler.ts
import { DiscordSDK } from '@discord/embedded-app-sdk';

export class DiscordOAuthHandler {
    private sdk: DiscordSDK;
    private clientId: string;
    private redirectUri: string;

    constructor() {
        this.clientId = 'YOUR_DISCORD_CLIENT_ID';
        this.redirectUri = 'https://your-backend.com/api/discord/callback';

        // 初始化 Embedded App SDK
        this.sdk = new DiscordSDK(this.clientId);
    }

    /**
     * 初始化 Discord SDK
     */
    async init() {
        await this.sdk.ready();
        console.log('[Discord] SDK Ready');
        console.log('[Discord] Channel:', this.sdk.channelId);
        console.log('[Discord] Guild:', this.sdk.guildId);
    }

    /**
     * 方案 A: 完整 OAuth Flow (Popup)
     */
    async loginWithOAuthPopup(): Promise<DiscordUserInfo> {
        try {
            // 1. 生成 state (CSRF 防护)
            const state = this.generateState();
            localStorage.setItem('discord_oauth_state', state);

            // 2. 构造 OAuth URL
            const scope = 'identify email'; // 根据需求调整
            const oauthUrl = `https://discord.com/api/oauth2/authorize?` +
                `client_id=${this.clientId}&` +
                `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
                `response_type=code&` +
                `scope=${encodeURIComponent(scope)}&` +
                `state=${state}`;

            // 3. 打开 popup 窗口
            const popup = window.open(
                oauthUrl,
                'discord-oauth',
                'width=500,height=700'
            );

            // 4. 监听回调消息 (从后端postMessage回来)
            return new Promise((resolve, reject) => {
                const messageHandler = (event: MessageEvent) => {
                    // 安全检查：验证 origin
                    if (event.origin !== 'https://your-backend.com') {
                        return;
                    }

                    const { type, data } = event.data;

                    if (type === 'discord-oauth-success') {
                        // 5. 验证 state
                        const savedState = localStorage.getItem('discord_oauth_state');
                        if (data.state !== savedState) {
                            reject(new Error('State mismatch - CSRF detected'));
                            return;
                        }

                        // 6. 清理并关闭
                        localStorage.removeItem('discord_oauth_state');
                        window.removeEventListener('message', messageHandler);
                        if (popup) popup.close();

                        resolve(data.userInfo);
                    } else if (type === 'discord-oauth-error') {
                        reject(new Error(data.error));
                        window.removeEventListener('message', messageHandler);
                        if (popup) popup.close();
                    }
                };

                window.addEventListener('message', messageHandler);

                // 超时处理
                setTimeout(() => {
                    window.removeEventListener('message', messageHandler);
                    if (popup && !popup.closed) {
                        popup.close();
                    }
                    reject(new Error('OAuth timeout'));
                }, 5 * 60 * 1000); // 5分钟
            });

        } catch (error) {
            console.error('[Discord OAuth] Error:', error);
            throw error;
        }
    }

    /**
     * 生成随机 state
     */
    private generateState(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }
}

interface DiscordUserInfo {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    email?: string;
    verified?: boolean;
}
```

#### Activity 主逻辑

```typescript
// discord-activity-manager.ts
import { DiscordOAuthHandler } from './discord-oauth-handler';
import { NetworkManager } from './network-manager';

export class DiscordActivityManager {
    private oauthHandler: DiscordOAuthHandler;

    constructor() {
        this.oauthHandler = new DiscordOAuthHandler();
    }

    async initialize() {
        // 初始化 Discord SDK
        await this.oauthHandler.init();

        // 尝试自动登录（如果有保存的session）
        const savedSession = this.loadSession();
        if (savedSession) {
            try {
                await this.loginToGame(savedSession.gameToken);
                return;
            } catch (error) {
                console.log('[Activity] Saved session invalid, need re-login');
            }
        }

        // 显示登录界面
        this.showLoginUI();
    }

    async onLoginButtonClick() {
        try {
            // 显示loading
            this.showLoading('Connecting to Discord...');

            // 方案A: OAuth Popup
            const discordUser = await this.oauthHandler.loginWithOAuthPopup();

            // 调用游戏服务器登录
            const gameToken = await this.loginToGameServer(discordUser);

            // 保存session
            this.saveSession({ gameToken, discordId: discordUser.id });

            // 进入游戏
            await this.loginToGame(gameToken);

        } catch (error) {
            this.showError(`Login failed: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    private async loginToGameServer(discordUser: DiscordUserInfo): Promise<string> {
        // 调用你的游戏服务器
        const res = await NetworkManager.instance.gate.client!.callApi(
            'PlatformLogin',
            {
                platform: 'discord',
                platformUserId: discordUser.id,
                platformUsername: discordUser.username,
                // 注意：不要发送 accessToken 到前端，在后端已经处理
            }
        );

        if (!res.isSucc) {
            throw new Error(res.err.message);
        }

        return res.res.gameToken;
    }

    private async loginToGame(gameToken: string) {
        // 使用 gameToken 初始化游戏
        // ...加载游戏数据、进入主界面等
    }

    private saveSession(data: { gameToken: string; discordId: string }) {
        localStorage.setItem('game_session', JSON.stringify(data));
    }

    private loadSession() {
        const data = localStorage.getItem('game_session');
        return data ? JSON.parse(data) : null;
    }

    private showLoginUI() { /* ... */ }
    private showLoading(msg: string) { /* ... */ }
    private hideLoading() { /* ... */ }
    private showError(msg: string) { /* ... */ }
}
```

---

### A.2 后端实现 (OAuth Callback)

#### 安装依赖

```bash
npm install axios
```

#### Discord OAuth Controller

```typescript
// discord-oauth-controller.ts
import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Discord OAuth 配置
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;

/**
 * OAuth 回调端点
 * Discord 会重定向到这里: ?code=xxx&state=yyy
 */
router.get('/api/discord/callback', async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).send('Missing code or state');
        }

        // 1. 用 code 换取 access_token
        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code as string,
                redirect_uri: REDIRECT_URI,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const {
            access_token,
            refresh_token,
            expires_in,
            scope
        } = tokenResponse.data;

        // 2. 获取用户信息
        const userResponse = await axios.get(
            'https://discord.com/api/users/@me',
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );

        const discordUser = userResponse.data;
        // discordUser: { id, username, discriminator, avatar, email, verified }

        // 3. 保存绑定到数据库
        await saveDiscordBinding({
            userId: discordUser.id,
            username: discordUser.username,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: Date.now() + expires_in * 1000,
            email: discordUser.email,
            scope: scope,
        });

        // 4. 返回HTML页面，用 postMessage 发送结果给 opener (iframe)
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Discord Login</title>
</head>
<body>
    <script>
        // 发送结果给打开此窗口的 iframe
        if (window.opener) {
            window.opener.postMessage({
                type: 'discord-oauth-success',
                data: {
                    state: '${state}',
                    userInfo: {
                        id: '${discordUser.id}',
                        username: '${discordUser.username}',
                        discriminator: '${discordUser.discriminator}',
                        avatar: '${discordUser.avatar}',
                        email: '${discordUser.email || ''}',
                        verified: ${discordUser.verified || false}
                    }
                }
            }, 'https://your-activity-domain.com');

            // 自动关闭窗口
            setTimeout(() => window.close(), 1000);
        } else {
            document.body.innerHTML = '<p>Login successful! You can close this window.</p>';
        }
    </script>
    <p>Login successful! Closing window...</p>
</body>
</html>
        `;

        res.send(html);

    } catch (error) {
        console.error('[Discord OAuth] Error:', error);

        // 返回错误页面
        const html = `
<!DOCTYPE html>
<html>
<body>
    <script>
        if (window.opener) {
            window.opener.postMessage({
                type: 'discord-oauth-error',
                data: {
                    error: '${error.message}'
                }
            }, 'https://your-activity-domain.com');
            window.close();
        } else {
            document.body.innerHTML = '<p>Login failed: ${error.message}</p>';
        }
    </script>
</body>
</html>
        `;

        res.status(500).send(html);
    }
});

/**
 * Refresh token (定期刷新)
 */
router.post('/api/discord/refresh', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        const response = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        res.json(response.data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 辅助函数：保存Discord绑定
async function saveDiscordBinding(data: {
    userId: string;
    username: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    email?: string;
    scope: string;
}) {
    // 保存到数据库 (platform_bindings 表)
    // 实现参考之前的 MULTI_PLATFORM_AUTH_DESIGN.md
}

export default router;
```

---

## ⚡ 方案 B: Embedded SDK 快速获取

### B.1 使用 SDK Helper (推荐快速启动)

```typescript
// discord-sdk-auth.ts
import { DiscordSDK } from '@discord/embedded-app-sdk';

export class DiscordSDKAuth {
    private sdk: DiscordSDK;

    constructor() {
        this.sdk = new DiscordSDK('YOUR_DISCORD_CLIENT_ID');
    }

    async init() {
        await this.sdk.ready();
    }

    /**
     * 方案 B: 使用 SDK 直接获取 access token
     * 优点：无需popup，快速简单
     * 缺点：token 短期，权限有限
     */
    async loginWithSDK(): Promise<DiscordSDKUserInfo> {
        try {
            // 1. 通过 SDK 授权获取 access token
            const { access_token } = await this.sdk.commands.authorize({
                client_id: this.sdk.clientId,
                response_type: 'token',
                state: this.generateState(),
                prompt: 'none',
                scope: [
                    'identify',
                    // 'email', // 如果需要
                    // 'guilds', // 如果需要服务器列表
                ],
            });

            // 2. 使用 token 获取用户信息
            const response = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }

            const user = await response.json();

            return {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                avatar: user.avatar,
                accessToken: access_token,
            };

        } catch (error) {
            console.error('[Discord SDK Auth] Error:', error);
            throw error;
        }
    }

    /**
     * 获取当前 Activity context
     */
    getContext() {
        return {
            channelId: this.sdk.channelId,
            guildId: this.sdk.guildId,
        };
    }

    private generateState(): string {
        return Math.random().toString(36).substring(7);
    }
}

interface DiscordSDKUserInfo {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    accessToken: string;
}
```

### B.2 在游戏中使用

```typescript
// game-entry.ts
import { DiscordSDKAuth } from './discord-sdk-auth';
import { NetworkManager } from './network-manager';

async function initGame() {
    const discordAuth = new DiscordSDKAuth();

    // 1. 初始化 Discord SDK
    await discordAuth.init();
    console.log('[Game] Discord SDK ready');

    // 2. 快速登录
    try {
        const discordUser = await discordAuth.loginWithSDK();
        console.log('[Game] Discord user:', discordUser.username);

        // 3. 调用游戏服务器
        const res = await NetworkManager.instance.gate.client!.callApi(
            'PlatformLogin',
            {
                platform: 'discord',
                platformUserId: discordUser.id,
                platformUsername: discordUser.username,
                accessToken: discordUser.accessToken, // SDK 方式需要发送 token 验证
            }
        );

        if (res.isSucc) {
            // 4. 登录成功，保存 game token
            const gameToken = res.res.gameToken;
            localStorage.setItem('game_token', gameToken);

            // 5. 初始化游戏
            await startGame(res.res);
        }

    } catch (error) {
        console.error('[Game] Login failed:', error);
        showLoginError(error.message);
    }
}

async function startGame(userData: any) {
    // 加载游戏数据
    // 进入主场景
    // ...
}

// 启动
initGame();
```

---

## 🔐 zkLogin 集成

### 将 Discord ID 转换为 zkLogin 身份

#### 后端：签发自定义 ID Token

```typescript
// zklogin-bridge.ts
import jwt from 'jsonwebtoken';

/**
 * 为 Discord 用户签发符合 zkLogin 的 ID Token
 * 这个 token 可以用于 zkLogin 生成 Sui 地址
 */
export function issueZkLoginToken(discordUser: {
    id: string;
    username: string;
    email?: string;
}): string {
    // zkLogin 需要的 JWT claims
    const payload = {
        iss: 'https://your-backend.com',           // 你的后端域名
        sub: `discord:${discordUser.id}`,          // subject (唯一标识)
        aud: 'oops-moba',                           // audience
        iat: Math.floor(Date.now() / 1000),        // issued at
        exp: Math.floor(Date.now() / 1000) + 3600, // 1小时过期
        nonce: '', // zkLogin 会提供，前端需要先生成

        // 自定义字段
        platform: 'discord',
        discord_id: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
    };

    // 使用你的私钥签名 (需要对应的公钥在 zkLogin 验证)
    const privateKey = process.env.ZKLOGIN_PRIVATE_KEY!;
    const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        keyid: 'key-1', // 密钥ID
    });

    return token;
}
```

#### 前端：完整的 zkLogin 流程

```typescript
// zklogin-integration.ts
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { generateNonce, generateRandomness } from '@mysten/zklogin';
import { jwtToAddress } from '@mysten/zklogin';

export class ZkLoginIntegration {
    /**
     * 使用 Discord 身份创建 Sui 地址
     */
    async createSuiAddressWithDiscord(discordUserId: string): Promise<{
        suiAddress: string;
        ephemeralKeyPair: Ed25519Keypair;
        randomness: string;
    }> {
        // 1. 生成临时密钥对
        const ephemeralKeyPair = new Ed25519Keypair();

        // 2. 生成随机数 (salt)
        const randomness = generateRandomness();

        // 3. 生成 nonce (challenge)
        const nonce = generateNonce(
            ephemeralKeyPair.getPublicKey(),
            randomness
        );

        // 4. 调用后端获取 ID Token (带上 nonce)
        const idToken = await this.getZkLoginToken(discordUserId, nonce);

        // 5. 生成 Sui 地址
        const suiAddress = jwtToAddress(idToken, randomness);

        // 6. 保存必要信息 (用于后续签名)
        return {
            suiAddress,
            ephemeralKeyPair,
            randomness,
        };
    }

    /**
     * 调用后端获取 zkLogin ID Token
     */
    private async getZkLoginToken(discordUserId: string, nonce: string): Promise<string> {
        const response = await fetch('https://your-backend.com/api/zklogin/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                discordUserId,
                nonce,
            }),
        });

        const data = await response.json();
        return data.idToken;
    }

    /**
     * 绑定 Sui 地址到游戏账号
     */
    async bindSuiAddress(gameToken: string, suiData: {
        suiAddress: string;
        ephemeralKeyPair: Ed25519Keypair;
        randomness: string;
    }) {
        // 调用游戏服务器的绑定API
        const res = await NetworkManager.instance.gate.client!.callApi(
            'BindSuiPasskey',
            {
                gameToken,
                suiAddress: suiData.suiAddress,
                // 保存必要的信息到后端
                metadata: {
                    randomness: suiData.randomness,
                    publicKey: suiData.ephemeralKeyPair.getPublicKey().toBase64(),
                },
            }
        );

        return res;
    }
}
```

#### 后端：zkLogin Token 签发 API

```typescript
// zklogin-controller.ts
import { Router } from 'express';
import { issueZkLoginToken } from './zklogin-bridge';

const router = Router();

/**
 * 为 Discord 用户签发 zkLogin ID Token
 */
router.post('/api/zklogin/token', async (req, res) => {
    try {
        const { discordUserId, nonce } = req.body;

        // 1. 验证用户身份 (从数据库获取)
        const discordUser = await getDiscordUserById(discordUserId);
        if (!discordUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. 签发 ID Token (包含 nonce)
        const idToken = issueZkLoginToken({
            id: discordUser.id,
            username: discordUser.username,
            email: discordUser.email,
            nonce, // 重要：包含前端提供的 nonce
        });

        res.json({ idToken });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function getDiscordUserById(discordId: string) {
    // 从数据库查询
    // ...
}

export default router;
```

---

## 🎯 完整使用流程

### 场景：用户在 Discord Activity 中首次登录并绑定 Sui 地址

```typescript
// complete-flow.ts
import { DiscordSDKAuth } from './discord-sdk-auth';
import { ZkLoginIntegration } from './zklogin-integration';
import { NetworkManager } from './network-manager';

async function completeLoginFlow() {
    try {
        // ========== 第1步：Discord 登录 ==========
        console.log('[Flow] Step 1: Discord Login');

        const discordAuth = new DiscordSDKAuth();
        await discordAuth.init();

        // 使用方案B快速登录
        const discordUser = await discordAuth.loginWithSDK();
        console.log('[Flow] Discord user:', discordUser.username);

        // ========== 第2步：游戏服务器登录 ==========
        console.log('[Flow] Step 2: Game Server Login');

        const loginRes = await NetworkManager.instance.gate.client!.callApi(
            'PlatformLogin',
            {
                platform: 'discord',
                platformUserId: discordUser.id,
                platformUsername: discordUser.username,
                accessToken: discordUser.accessToken,
            }
        );

        if (!loginRes.isSucc) {
            throw new Error('Game login failed');
        }

        const { gameToken, userId, hasPasskey } = loginRes.res;
        console.log('[Flow] Game login success, userId:', userId);

        // ========== 第3步：检查是否需要绑定 Sui 地址 ==========
        if (!hasPasskey) {
            console.log('[Flow] Step 3: Create Sui Address');

            const zkLogin = new ZkLoginIntegration();

            // 创建 Sui 地址
            const suiData = await zkLogin.createSuiAddressWithDiscord(discordUser.id);
            console.log('[Flow] Sui address created:', suiData.suiAddress);

            // 绑定到游戏账号
            await zkLogin.bindSuiAddress(gameToken, suiData);
            console.log('[Flow] Sui address bound to game account');

            // 保存到本地（用于后续签名）
            localStorage.setItem('sui_data', JSON.stringify({
                address: suiData.suiAddress,
                randomness: suiData.randomness,
                // 注意：私钥不要明文存储，考虑加密
            }));
        }

        // ========== 第4步：进入游戏 ==========
        console.log('[Flow] Step 4: Enter Game');
        await startGame(loginRes.res);

    } catch (error) {
        console.error('[Flow] Error:', error);
        showError(error.message);
    }
}

// 启动
completeLoginFlow();
```

---

## 📦 项目结构

```
discord-activity/
├── client/                          # 前端
│   ├── src/
│   │   ├── discord/
│   │   │   ├── discord-sdk-auth.ts          # 方案B: SDK快速登录
│   │   │   ├── discord-oauth-handler.ts     # 方案A: OAuth Popup
│   │   │   └── discord-activity-manager.ts  # Activity 主逻辑
│   │   ├── zklogin/
│   │   │   └── zklogin-integration.ts       # zkLogin 集成
│   │   ├── network/
│   │   │   └── network-manager.ts           # 网络管理
│   │   └── main.ts                          # 入口
│   ├── public/
│   │   └── manifest.json                    # Discord Activity Manifest
│   └── package.json
│
├── server/                          # 后端
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── discord-oauth-controller.ts  # Discord OAuth回调
│   │   │   └── zklogin-controller.ts        # zkLogin Token签发
│   │   ├── services/
│   │   │   └── zklogin-bridge.ts            # zkLogin JWT签发
│   │   └── server.ts
│   └── package.json
│
└── README.md
```

---

## 🚀 部署配置

### Discord Developer Portal 配置

1. **创建 Application**
   - 访问 https://discord.com/developers/applications
   - 创建新应用

2. **配置 OAuth2**
   - Redirects: `https://your-backend.com/api/discord/callback`
   - Scopes: `identify`, `email` (可选)

3. **配置 Activity (Embedded App)**
   - URL Mappings: `/` → `https://your-activity.com`
   - Supported Platforms: Desktop, Mobile, Web

4. **获取凭证**
   ```env
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   DISCORD_REDIRECT_URI=https://your-backend.com/api/discord/callback
   ```

### Manifest 文件

```json
// public/manifest.json
{
    "name": "OOPS-MOBA",
    "description": "Play MOBA in Discord!",
    "developer": {
        "name": "Your Team"
    },
    "activities": [
        {
            "name": "OOPS-MOBA",
            "activity_preview_video_asset_id": null,
            "supported_platforms": [
                "desktop",
                "mobile",
                "web"
            ],
            "orientation_lock_state": "landscape"
        }
    ],
    "embedded_activity_config": {
        "supported_launches": [
            "activity_tab"
        ],
        "default_orientation_lock_state": "landscape"
    }
}
```

### 环境变量

```env
# Discord
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://your-backend.com/api/discord/callback

# zkLogin
ZKLOGIN_PRIVATE_KEY=your_rs256_private_key
ZKLOGIN_PUBLIC_KEY=your_rs256_public_key

# Server
NODE_ENV=production
PORT=3000
```

---

## ✅ 测试清单

### Discord Activity 测试

- [ ] SDK 能正常初始化
- [ ] 能获取 channelId 和 guildId
- [ ] 方案B: SDK authorize 能获取 access_token
- [ ] 方案A: OAuth popup 能正常打开和回调
- [ ] postMessage 通信正常
- [ ] State 验证正常工作

### OAuth 测试

- [ ] 授权页面正常显示
- [ ] 用户同意后正确回调
- [ ] code 换 token 成功
- [ ] 获取用户信息成功
- [ ] refresh_token 刷新成功

### zkLogin 测试

- [ ] nonce 生成正确
- [ ] ID Token 签发成功
- [ ] Sui 地址生成正确
- [ ] 地址绑定到游戏账号成功
- [ ] 跨平台登录能访问同一地址

---

## 🔧 故障排查

### 问题1: SDK 初始化失败

```
Error: DiscordSDK not ready
```

**解决**:
```typescript
// 确保在 Discord iframe 环境中
if (window.parent !== window) {
    // 在 Discord Activity 中
    await sdk.ready();
} else {
    // 开发环境模拟
    console.warn('Not in Discord Activity');
}
```

### 问题2: OAuth Popup 被阻止

**解决**: 确保在用户点击事件中打开popup

```typescript
// ❌ 错误
async function autoLogin() {
    const user = await loginWithOAuthPopup(); // popup会被阻止
}

// ✅ 正确
button.onclick = async () => {
    const user = await loginWithOAuthPopup(); // 用户触发
};
```

### 问题3: postMessage 收不到

**解决**: 检查 origin 和时机

```typescript
// 确保 origin 匹配
if (event.origin !== 'https://your-backend.com') {
    return; // 忽略其他来源
}

// 确保在回调页面中发送
if (window.opener) {
    window.opener.postMessage(data, targetOrigin);
}
```

---

## 📚 参考资源

- [Discord Embedded App SDK](https://discord.com/developers/docs/activities/overview)
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [Sui zkLogin](https://docs.sui.io/concepts/cryptography/zklogin)
- [@discord/embedded-app-sdk](https://github.com/discord/embedded-app-sdk)

---

## ✅ 总结

### 推荐方案

**快速启动**: 方案B (SDK Helper)
- 实现简单，无需popup
- 适合只需要身份标识的场景
- 5-10分钟即可完成集成

**完整功能**: 方案A (OAuth Popup)
- 支持长期token和refresh
- 可获取完整用户信息
- 适合需要邮箱等额外信息的场景

**最佳实践**: 两者结合
- 首次启动用方案B快速登录
- 需要额外权限时再用方案A

### 开发时间估算

| 阶段 | 时间 |
|------|------|
| 方案B集成 | 2-3小时 |
| 方案A集成 | 4-6小时 |
| zkLogin集成 | 3-4小时 |
| 测试调试 | 2-3小时 |
| **总计** | **11-16小时 (1.5-2天)** |

需要我帮你实现某个具体部分吗？或者你有其他问题？

---

**文档维护**: Claude Code
**最后更新**: 2025-12-04
**版本**: v1.0
