/**
 * 跨平台认证模块 - 生产可用版本
 *
 * 功能：
 * - 支持 Discord、Telegram、Web 等多平台统一登录
 * - 使用 zkLogin 生成统一的 Sui 地址
 * - 数据完全跨平台同步
 *
 * 使用方法：
 * const auth = new CrossPlatformAuth({ platform, clientId, backendUrl });
 * const identity = await auth.initialize();
 */

import { DiscordSDK } from '@discord/embedded-app-sdk';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { generateNonce, generateRandomness } from '@mysten/zklogin';
import { jwtToAddress } from '@mysten/zklogin';

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

        if (this.platform === 'discord') {
            this.sdk = new DiscordSDK(this.clientId);
        }
    }

    /**
     * 统一初始化入口
     */
    async initialize(): Promise<UnifiedLoginResult> {
        console.log(`[CrossPlatformAuth] Initializing for ${this.platform}...`);

        // 检查缓存
        const cached = this.loadCachedSession();
        if (cached && await this.validateSession(cached)) {
            console.log('[CrossPlatformAuth] Using cached session');
            return cached;
        }

        // 根据平台登录
        switch (this.platform) {
            case 'discord':
                return await this.loginDiscord();
            case 'telegram':
                return await this.loginTelegram();
            case 'web':
                return await this.loginWeb();
        }
    }

    /**
     * Discord 登录（SDK方案）
     */
    private async loginDiscord(): Promise<UnifiedLoginResult> {
        if (!this.sdk) throw new Error('Discord SDK not initialized');

        await this.sdk.ready();
        console.log('[CrossPlatformAuth] Discord SDK ready');

        const auth = await this.sdk.commands.authorize({
            client_id: this.clientId,
            response_type: 'token',
            state: this.generateState(),
            prompt: 'none',
            scope: ['identify'],
        });

        const discordUser = await this.fetchDiscordUser(auth.access_token);

        return await this.createUnifiedIdentity({
            platform: 'discord',
            platformUserId: discordUser.id,
            platformUsername: discordUser.username,
            platformData: discordUser,
        });
    }

    /**
     * Telegram 登录
     */
    private async loginTelegram(): Promise<UnifiedLoginResult> {
        const telegram = (window as any).Telegram?.WebApp;
        if (!telegram) throw new Error('Not in Telegram environment');

        const user = telegram.initDataUnsafe.user;
        if (!user) throw new Error('Telegram user not found');

        return await this.createUnifiedIdentity({
            platform: 'telegram',
            platformUserId: user.id.toString(),
            platformUsername: user.username || user.first_name,
            platformData: {
                ...user,
                initData: telegram.initData,
            },
        });
    }

    /**
     * Web 登录（Google OAuth）
     */
    private async loginWeb(): Promise<UnifiedLoginResult> {
        // 生成zkLogin参数
        const ephemeralKeyPair = new Ed25519Keypair();
        const randomness = generateRandomness();
        const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), randomness);

        // 触发Google OAuth
        const jwt = await this.getGoogleJWT(nonce);
        const payload = this.parseJWT(jwt);

        return await this.createUnifiedIdentity({
            platform: 'google',
            platformUserId: payload.sub,
            platformUsername: payload.email || payload.name,
            platformData: {
                email: payload.email,
                jwt,
                nonce,
                randomness,
            },
        });
    }

    /**
     * 创建统一身份（核心逻辑）
     */
    private async createUnifiedIdentity(identity: PlatformIdentity): Promise<UnifiedLoginResult> {
        const response = await fetch(`${this.backendUrl}/api/unified-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(identity),
        });

        if (!response.ok) {
            throw new Error(`Unified login failed: ${response.statusText}`);
        }

        const result = await response.json();
        this.cacheSession(result);

        return result;
    }

    /**
     * 获取Discord用户信息
     */
    private async fetchDiscordUser(accessToken: string): Promise<any> {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch Discord user');
        }

        return await response.json();
    }

    /**
     * Google OAuth流程
     */
    private async getGoogleJWT(nonce: string): Promise<string> {
        const googleClientId = 'YOUR_GOOGLE_CLIENT_ID';
        const redirectUri = `${this.backendUrl}/oauth/google/callback`;

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${googleClientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=id_token&` +
            `scope=openid%20profile%20email&` +
            `nonce=${nonce}`;

        return new Promise((resolve, reject) => {
            const popup = window.open(authUrl, 'google-oauth', 'width=500,height=600');

            const handler = (event: MessageEvent) => {
                if (event.origin !== this.backendUrl) return;

                if (event.data.type === 'google-oauth-success') {
                    window.removeEventListener('message', handler);
                    popup?.close();
                    resolve(event.data.data.idToken);
                } else if (event.data.type === 'google-oauth-error') {
                    window.removeEventListener('message', handler);
                    popup?.close();
                    reject(new Error(event.data.data.error));
                }
            };

            window.addEventListener('message', handler);
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
        if (parts.length !== 3) throw new Error('Invalid JWT');

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    }

    /**
     * 验证Session有效性
     */
    private async validateSession(session: UnifiedLoginResult): Promise<boolean> {
        if (session.expiresAt < Date.now()) return false;

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
     * Session缓存管理
     */
    private cacheSession(session: UnifiedLoginResult): void {
        localStorage.setItem('unified_session', JSON.stringify(session));
    }

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

export interface UnifiedLoginResult {
    suiAddress: string;
    gameToken: string;
    userId: string;
    username: string;
    level: number;
    gold: number;
    exp: number;
    currentPlatform: string;
    boundPlatforms: string[];
    nftCount: number;
    tokenBalances: Array<{
        coinType: string;
        balance: string;
    }>;
    expiresAt: number;
}
