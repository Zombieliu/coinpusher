/**
 * Discord Activity 最佳实践示例
 *
 * 策略：方案B为主 + 方案A为辅 + zkLogin增强
 */

import { DiscordSDK } from '@discord/embedded-app-sdk';
import { generateNonce, jwtToAddress } from '@mysten/zklogin';

// ============================================
// 核心类：Discord Activity 管理器
// ============================================

export class DiscordActivityManager {
    private sdk: DiscordSDK;
    private clientId: string = 'YOUR_CLIENT_ID';

    constructor() {
        this.sdk = new DiscordSDK(this.clientId);
    }

    /**
     * 初始化 Discord Activity
     * 这是第一个被调用的方法
     */
    async initialize() {
        console.log('[Activity] Initializing...');

        // 1. 等待 Discord SDK 准备好
        await this.sdk.ready();

        console.log('[Activity] Discord SDK Ready');
        console.log('[Activity] Channel:', this.sdk.channelId);
        console.log('[Activity] Guild:', this.sdk.guildId);

        // 2. 检查本地session
        const savedSession = this.loadLocalSession();
        if (savedSession && this.isSessionValid(savedSession)) {
            console.log('[Activity] Found valid session, auto login');
            try {
                await this.autoLogin(savedSession);
                return;
            } catch (error) {
                console.log('[Activity] Auto login failed, need manual login');
            }
        }

        // 3. 显示登录界面（或自动登录）
        await this.performInitialLogin();
    }

    /**
     * 执行初始登录（方案B - SDK快速登录）
     */
    private async performInitialLogin() {
        try {
            console.log('[Activity] Starting SDK login...');
            this.showLoading('Connecting to Discord...');

            // 使用方案B: SDK授权（无popup，用户体验最好）
            const auth = await this.sdk.commands.authorize({
                client_id: this.clientId,
                response_type: 'token',
                state: this.generateState(),
                prompt: 'none', // 静默授权
                scope: [
                    'identify',
                    // 'guilds', // 如果需要服务器信息
                ],
            });

            const accessToken = auth.access_token;

            // 获取Discord用户信息
            const discordUser = await this.getDiscordUser(accessToken);
            console.log('[Activity] Discord user:', discordUser.username);

            // 调用游戏服务器登录
            const gameSession = await this.loginToGameServer({
                platform: 'discord',
                platformUserId: discordUser.id,
                platformUsername: discordUser.username,
                accessToken: accessToken,
            });

            // 保存session
            this.saveLocalSession(gameSession);

            // 进入游戏
            await this.enterGame(gameSession);

        } catch (error) {
            console.error('[Activity] Login failed:', error);

            // 如果SDK授权失败，显示手动登录按钮
            this.showManualLoginButton();
        }
    }

    /**
     * 手动登录（方案A - OAuth Popup，作为fallback）
     * 仅在SDK授权失败或需要更多权限时使用
     */
    async manualLoginWithPopup() {
        try {
            console.log('[Activity] Starting OAuth popup login...');
            this.showLoading('Opening Discord authorization...');

            const state = this.generateState();
            localStorage.setItem('oauth_state', state);

            const oauthUrl = `https://discord.com/api/oauth2/authorize?` +
                `client_id=${this.clientId}&` +
                `redirect_uri=${encodeURIComponent('https://your-backend.com/api/discord/callback')}&` +
                `response_type=code&` +
                `scope=identify%20email&` +
                `state=${state}`;

            // 打开popup（用户主动点击，不会被阻止）
            const popup = window.open(oauthUrl, 'discord-oauth', 'width=500,height=700');

            // 等待回调
            const result = await this.waitForOAuthCallback();

            // 登录游戏服务器
            const gameSession = await this.loginToGameServer({
                platform: 'discord',
                platformUserId: result.userInfo.id,
                platformUsername: result.userInfo.username,
                // OAuth方式不需要发送token到前端
            });

            this.saveLocalSession(gameSession);
            await this.enterGame(gameSession);

        } catch (error) {
            console.error('[Activity] Manual login failed:', error);
            this.showError(`Login failed: ${error.message}`);
        }
    }

    /**
     * 进入游戏后的操作
     */
    private async enterGame(session: GameSession) {
        console.log('[Activity] Entering game...');

        // 1. 加载游戏数据
        const userData = await this.loadGameData(session.gameToken);

        // 2. 检查是否需要绑定Sui地址（用于跨平台）
        if (!userData.hasSuiAddress) {
            console.log('[Activity] Creating Sui address...');
            await this.createAndBindSuiAddress(session);
        }

        // 3. 初始化游戏
        await this.startGame(userData);

        console.log('[Activity] Game started!');
        this.hideLoading();
    }

    /**
     * 创建并绑定Sui地址（用于跨平台身份）
     */
    private async createAndBindSuiAddress(session: GameSession) {
        try {
            // 1. 生成zkLogin参数
            const ephemeralKeyPair = new Ed25519Keypair();
            const randomness = generateRandomness();
            const nonce = generateNonce(
                ephemeralKeyPair.getPublicKey(),
                randomness
            );

            // 2. 获取ID Token（从你的后端）
            const idTokenResponse = await fetch('https://your-backend.com/api/zklogin/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.gameToken}`
                },
                body: JSON.stringify({
                    platform: 'discord',
                    platformUserId: session.userId,
                    nonce: nonce,
                }),
            });

            const { idToken } = await idTokenResponse.json();

            // 3. 生成Sui地址
            const suiAddress = jwtToAddress(idToken, randomness);
            console.log('[Activity] Sui address created:', suiAddress);

            // 4. 绑定到游戏账号
            await this.bindSuiAddress(session.gameToken, {
                suiAddress,
                randomness,
                publicKey: ephemeralKeyPair.getPublicKey().toBase64(),
            });

            console.log('[Activity] Sui address bound successfully');

        } catch (error) {
            console.error('[Activity] Failed to create Sui address:', error);
            // 不阻塞游戏启动，可以稍后再试
        }
    }

    // ============================================
    // 辅助方法
    // ============================================

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
     * 调用游戏服务器登录
     */
    private async loginToGameServer(credentials: {
        platform: string;
        platformUserId: string;
        platformUsername: string;
        accessToken?: string;
    }): Promise<GameSession> {
        const response = await fetch('https://your-game-server.com/api/platform-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            throw new Error('Game server login failed');
        }

        const data = await response.json();
        return {
            gameToken: data.gameToken,
            userId: data.userId,
            username: data.username,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时
        };
    }

    /**
     * 加载游戏数据
     */
    private async loadGameData(gameToken: string) {
        const response = await fetch('https://your-game-server.com/api/user/data', {
            headers: { 'Authorization': `Bearer ${gameToken}` },
        });

        return await response.json();
    }

    /**
     * 绑定Sui地址
     */
    private async bindSuiAddress(gameToken: string, suiData: any) {
        const response = await fetch('https://your-game-server.com/api/bind-sui-address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gameToken}`
            },
            body: JSON.stringify(suiData),
        });

        return await response.json();
    }

    /**
     * 启动游戏
     */
    private async startGame(userData: any) {
        // 初始化Cocos游戏引擎
        // 加载场景
        // 显示主界面
        console.log('[Activity] Starting game with user:', userData);
    }

    /**
     * 等待OAuth回调
     */
    private waitForOAuthCallback(): Promise<any> {
        return new Promise((resolve, reject) => {
            const handler = (event: MessageEvent) => {
                if (event.origin !== 'https://your-backend.com') return;

                const { type, data } = event.data;
                if (type === 'discord-oauth-success') {
                    const savedState = localStorage.getItem('oauth_state');
                    if (data.state !== savedState) {
                        reject(new Error('State mismatch'));
                        return;
                    }
                    window.removeEventListener('message', handler);
                    resolve(data);
                } else if (type === 'discord-oauth-error') {
                    window.removeEventListener('message', handler);
                    reject(new Error(data.error));
                }
            };

            window.addEventListener('message', handler);

            // 超时
            setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('OAuth timeout'));
            }, 5 * 60 * 1000);
        });
    }

    // ============================================
    // Session管理
    // ============================================

    private saveLocalSession(session: GameSession) {
        localStorage.setItem('game_session', JSON.stringify(session));
    }

    private loadLocalSession(): GameSession | null {
        const data = localStorage.getItem('game_session');
        return data ? JSON.parse(data) : null;
    }

    private isSessionValid(session: GameSession): boolean {
        return session.expiresAt > Date.now();
    }

    private async autoLogin(session: GameSession) {
        // 验证session是否仍然有效
        const response = await fetch('https://your-game-server.com/api/verify-token', {
            headers: { 'Authorization': `Bearer ${session.gameToken}` },
        });

        if (!response.ok) {
            throw new Error('Session expired');
        }

        await this.enterGame(session);
    }

    // ============================================
    // UI辅助方法
    // ============================================

    private showLoading(message: string) {
        console.log('[UI] Loading:', message);
        // 显示loading界面
    }

    private hideLoading() {
        console.log('[UI] Hide loading');
        // 隐藏loading界面
    }

    private showManualLoginButton() {
        console.log('[UI] Show manual login button');
        // 显示"手动登录"按钮，点击时调用 manualLoginWithPopup()
    }

    private showError(message: string) {
        console.error('[UI] Error:', message);
        // 显示错误提示
    }

    private generateState(): string {
        return Math.random().toString(36).substring(7);
    }
}

// ============================================
// 类型定义
// ============================================

interface GameSession {
    gameToken: string;
    userId: string;
    username: string;
    expiresAt: number;
}

interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    email?: string;
}

// ============================================
// 使用示例
// ============================================

// 在游戏入口处调用
async function initDiscordActivity() {
    const manager = new DiscordActivityManager();
    await manager.initialize();
}

// 启动
initDiscordActivity();
