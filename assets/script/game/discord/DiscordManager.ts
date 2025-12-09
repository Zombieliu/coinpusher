/**
 * @file discordManager.ts
 * @description Discord Activity 管理器 - 处理 Discord SDK 初始化和用户身份验证
 *
 * @module discord/discordManager
 *
 * @dependencies
 * - @discord/embedded-app-sdk: Discord Embedded App SDK
 * - suiManager.ts: Sui 钱包绑定
 *
 * @author Discord Integration Team
 * @created 2024-11-01
 * @updated 2024-11-27
 *
 * @description
 * DiscordManager 是与 Discord Embedded App SDK 通信的包装层。
 * 职责：
 * - 检测是否在 Discord Activity 环境中
 * - 等待 discord-init.js 完成初始化
 * - 获取用户和频道信息
 * - 生成基于频道的房间 ID
 * - 提供用户头像等信息
 *
 * @features
 * - ✅ Discord 环境自动检测
 * - ✅ SDK 初始化和上下文管理
 * - ✅ 用户信息查询
 * - ✅ 频道和服务器信息
 * - ✅ 房间 ID 生成
 * - ✅ 用户头像 URL 获取
 *
 * @example
 * ```typescript
 * const discordManager = DiscordManager.instance;
 *
 * if (discordManager.isInDiscord()) {
 *   const success = await discordManager.initialize();
 *   if (success) {
 *     const user = discordManager.getUser();
 *     console.log('Discord 用户:', user.username);
 *   }
 * }
 * ```
 *
 * @see {@link ../../discord-init.js} Discord 初始化脚本
 * @see {@link ../../DISCORD_ACTIVITY.md} Discord Activity 文档
 */

import { _decorator, sys } from 'cc';

const { ccclass } = _decorator;

/**
 * Discord 用户信息接口
 *
 * @interface DiscordUser
 */
export interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    global_name?: string;
}

/**
 * Discord 频道信息
 */
export interface DiscordChannel {
    id: string;
    type: number;
    guild_id?: string;
    name?: string;
}

/**
 * Discord 游戏上下文
 */
export interface DiscordContext {
    user: DiscordUser;
    channel: DiscordChannel;
    guildId?: string;
    instanceId: string;
}

/**
 * Discord Activity 管理器
 *
 * 负责与 Discord Embedded App SDK 通信
 * 获取用户信息、频道信息等
 */
@ccclass('DiscordManager')
export class DiscordManager {
    private static _instance: DiscordManager | null = null;

    private _context: DiscordContext | null = null;
    private _isDiscordEnvironment: boolean = false;
    private _isReady: boolean = false;

    private constructor() {
        this.detectDiscordEnvironment();
    }

    public static get instance(): DiscordManager {
        if (!this._instance) {
            this._instance = new DiscordManager();
        }
        return this._instance;
    }

    /**
     * 检测是否在 Discord Activity 环境中运行
     */
    private detectDiscordEnvironment(): void {
        // 🚨 DEBUG: 临时强制禁用Discord检测
        // 在本地开发时，强制设为false
        const forceDisable = true; // ← 本地开发时设为true，部署Discord版本时改为false

        if (forceDisable) {
            this._isDiscordEnvironment = false;
            console.log('[DiscordManager] 🔧 Discord detection DISABLED (force mode)');
            return;
        }

        // Discord Activity 会在 iframe 中运行，且有特定的标识
        if (sys.isBrowser) {
            try {
                // 检查是否有 Discord 上下文（最可靠的检测方式）
                const discordContextValue = (window as any).__DISCORD_CONTEXT__;
                const hasDiscordContext = !!discordContextValue && discordContextValue !== null;

                // 只有在有有效的 Discord 上下文时才认为是 Discord 环境
                this._isDiscordEnvironment = hasDiscordContext;

                console.log('[DiscordManager] 🔍 Environment Detection:', {
                    discordContextValue: discordContextValue,
                    hasDiscordContext: hasDiscordContext,
                    isDiscordEnvironment: this._isDiscordEnvironment,
                    windowLocation: typeof window !== 'undefined' ? window.location.href : 'N/A'
                });
            } catch (e) {
                console.warn('[DiscordManager] Cannot access Discord context, assuming NOT Discord environment:', e);
                this._isDiscordEnvironment = false;  // 修复：默认为非Discord环境
            }
        }
    }

    /**
     * 初始化 Discord 连接
     * 这个方法会等待外部 JS 完成 Discord SDK 初始化
     */
    public async initialize(): Promise<boolean> {
        if (!this._isDiscordEnvironment) {
            console.log('[DiscordManager] Not in Discord environment, skipping initialization');
            return false;
        }

        try {
            // 等待外部 Discord SDK 初始化完成
            const context = await this.waitForDiscordContext();

            if (context) {
                this._context = context;
                this._isReady = true;

                console.log('[DiscordManager] Initialized successfully:', {
                    user: context.user.username,
                    channel: context.channel.id,
                    guild: context.guildId
                });

                return true;
            } else {
                console.error('[DiscordManager] Failed to get Discord context');
                return false;
            }
        } catch (error) {
            console.error('[DiscordManager] Initialization error:', error);
            return false;
        }
    }

    /**
     * 等待 Discord 上下文准备就绪
     * 外部 JS 会在初始化完成后设置 window.__DISCORD_CONTEXT__
     */
    private waitForDiscordContext(timeout: number = 10000): Promise<DiscordContext | null> {
        return new Promise((resolve) => {
            const startTime = Date.now();

            const check = () => {
                const context = (window as any).__DISCORD_CONTEXT__;

                if (context) {
                    resolve(context);
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    console.error('[DiscordManager] Timeout waiting for Discord context');
                    resolve(null);
                    return;
                }

                setTimeout(check, 100);
            };

            check();
        });
    }

    /**
     * 获取当前 Discord 用户
     */
    public getUser(): DiscordUser | null {
        return this._context?.user || null;
    }

    /**
     * 获取当前频道
     */
    public getChannel(): DiscordChannel | null {
        return this._context?.channel || null;
    }

    /**
     * 获取服务器 ID
     */
    public getGuildId(): string | null {
        return this._context?.guildId || null;
    }

    /**
     * 获取实例 ID（用于区分同一频道的不同游戏实例）
     */
    public getInstanceId(): string | null {
        return this._context?.instanceId || null;
    }

    /**
     * 获取完整上下文
     */
    public getContext(): DiscordContext | null {
        return this._context;
    }

    /**
     * 是否在 Discord 环境中
     */
    public isInDiscord(): boolean {
        return this._isDiscordEnvironment;
    }

    /**
     * 是否已准备就绪
     */
    public isReady(): boolean {
        return this._isReady;
    }

    /**
     * 获取当前房间 ID
     * 基于频道 ID 生成，同一频道的玩家在同一房间
     */
    public getRoomId(): string {
        if (!this._context) {
            return 'default-room';
        }

        // 使用 guild_id + channel_id 作为房间 ID
        const guildPart = this._context.guildId || 'dm';
        const channelPart = this._context.channel.id;

        return `${guildPart}-${channelPart}`;
    }

    /**
     * 获取用户显示名称
     */
    public getUserDisplayName(): string {
        if (!this._context?.user) {
            return 'Guest';
        }

        const user = this._context.user;
        return user.global_name || user.username;
    }

    /**
     * 获取用户头像 URL
     */
    public getUserAvatarUrl(size: number = 128): string {
        if (!this._context?.user) {
            return '';
        }

        const user = this._context.user;
        if (!user.avatar) {
            // 默认头像
            const defaultAvatarNum = parseInt(user.discriminator) % 5;
            return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
        }

        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
    }
}

// 导出单例
export default DiscordManager.instance;
