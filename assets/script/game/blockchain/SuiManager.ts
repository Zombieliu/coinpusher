/**
 * @file suiManager.ts
 * @description Sui 区块链管理器 - 负责与 Sui 网络交互、钱包管理和交易签名
 *
 * @module game/suiManager
 *
 * @dependencies
 * - @mysten/sui: Sui TypeScript SDK
 * - dubhe.js: Obelisk 合约框架
 * - discordManager.ts: Discord 用户身份绑定
 *
 * @author Game Team
 * @created 2024-11-01
 * @updated 2024-11-27
 *
 * @description
 * SuiManager 是游戏与 Sui 区块链交互的中枢，采用单例模式。
 * 主要职责包括：
 * - Passkey 钱包创建和管理（使用 WebAuthn 生物识别）
 * - 钱包扩展连接（Sui Wallet、Suiet）
 * - Session Key 管理（游戏内免签名交易）
 * - Discord 用户绑定
 * - 链上金币查询和交易
 * - 合约调用和交易签名
 *
 * @features
 * - ✅ Passkey 生物识别登录
 * - ✅ 钱包扩展连接
 * - ✅ Session Key 自动管理（24小时过期）
 * - ✅ Discord 用户绑定
 * - ✅ 链上金币查询
 * - ✅ 交易签名和执行
 * - ✅ iOS Safari WebAuthn 兼容性
 *
 * @example
 * ```typescript
 * // 获取或创建实例
 * const suiManager = await SuiManager.ensureInstance();
 *
 * // 创建 Passkey
 * const keypair = await suiManager.ensurePasskey();
 *
 * // 查询金币
 * const gold = await suiManager.queryGoldFromChain();
 *
 * // 绑定 Discord 用户
 * await suiManager.bindDiscordUser();
 * ```
 *
 * @see {@link ../discord/discordManager.ts} Discord 集成
 * @see {@link ../../GOLD_CHAIN_INTEGRATION.md} 链上集成指南
 * @see {@link ../../SESSION_SETUP_GUIDE.md} Session Key 设置指南
 */

// 首先加载 polyfills（必须在所有其他导入之前）
import '../polyfills';

import { _decorator, Component } from 'cc';
import { DiscordManager } from '../discord/DiscordManager';

const { ccclass } = _decorator;

// 类型定义（避免编译时导入）
type Ed25519Keypair = any;
type PasskeyKeypair = any;
type SuiClient = any;
type Transaction = any;
type Dubhe = any;

// Session 配置常量
const SESSION_OWNER_KEY = 'gold-session-owner';
const SESSION_AUTH_KEY = 'gold-session-authkey';
const SESSION_READY_FLAG = 'gold-session-ready';
const PASSKEY_CACHE_KEY = 'gold-passkey-pub';
const SESSION_PRIVATE_KEY = 'gold-session-private-key'; // localStorage key for session private key
const SESSION_CREATED_AT_KEY = 'gold-session-created-at'; // Timestamp when session was created
const SESSION_EXPIRES_AT_KEY = 'gold-session-expires-at'; // Timestamp when session expires

// ==================== Session 安全配置 ====================
/** Session 最大有效期：24 小时后需要重新授权 */
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Session 过期前 2 小时发出警告 */
const SESSION_ROTATION_WARNING_MS = 2 * 60 * 60 * 1000;

// ==================== 网络配置 ====================
/** Sui 网络选择：testnet（测试网）、mainnet（主网）、devnet、localnet */
const NETWORK: 'testnet' | 'mainnet' | 'devnet' | 'localnet' = 'testnet';

/** Dubhe 合约的 Package ID - 需要替换为实际的 */
const PACKAGE_ID = '0x3240fe69e65ffa92e26e3dde0e81d865f1cc64ff3bf2117778aaf096feca5750';

/** Dubhe 合约的 Schema ID */
const SCHEMA_ID = '0xb65df6ea777f1ed0fb9a0d9173eec6b43f2ae1da4346af1b48f678d8af796379';

/** Dubhe Indexer gRPC 服务地址（用于快速查询链上数据） */
const GRPC_ENDPOINT = 'http://101.32.33.6:8080';

/**
 * Sui 区块链管理器（单例）
 *
 * @class SuiManager
 * @extends Component
 *
 * @description
 * 与 Sui 区块链交互的核心类，负责：
 * - 钱包管理（Passkey、钱包扩展、Session Key）
 * - 交易签名和执行
 * - 数据查询（金币、状态等）
 * - Discord 用户绑定
 *
 * @example
 * ```typescript
 * // 获取单例
 * const suiManager = await SuiManager.ensureInstance();
 *
 * // 创建 Passkey 钱包
 * const keypair = await suiManager.ensurePasskey();
 * const address = keypair.getPublicKey().toSuiAddress();
 *
 * // 查询链上金币
 * const gold = await suiManager.queryGoldFromChain();
 *
 * // 在 Discord 中绑定用户
 * await suiManager.bindDiscordUser();
 * ```
 *
 * @since 1.0.0
 */
@ccclass('SuiManager')
export class SuiManager extends Component {
    /** 单例实例 */
    public static instance: SuiManager | null = null;

    // ==================== Sui 区块链相关 ====================
    /** Sui RPC 客户端，用于与 Sui 节点通信 */
    private client: SuiClient | null = null;

    /** Dubhe 合约客户端，用于调用游戏合约 */
    private dubhe: Dubhe | null = null;

    // ==================== 钱包管理 ====================
    /** Passkey 密钥对（生物识别钱包），存储用户的私钥 */
    private passkeyKeypair: PasskeyKeypair | null = null;

    /** Session Key 密钥对，用于游戏内免签名交易 */
    private sessionKeypair: Ed25519Keypair | null = null;

    /** Passkey 提供者，负责处理 WebAuthn 生物识别 */
    private passkeyProvider: any = null;

    /** Dubhe gRPC 客户端，用于快速查询链上数据 */
    private grpcClient: any = null;

    /** 钱包扩展实例（如 Sui Wallet、Suiet） */
    private walletExtension: any = null;

    /** 钱包扩展返回的用户地址 */
    private walletAddress: string | null = null;

    // ==================== 运行时模块加载 ====================
    /** 动态加载的 Sui 和 Dubhe 模块（在 onLoad 时加载） */
    private _suiModules: any = null;

    /** 模块加载 Promise，确保多次调用时只加载一次 */
    private _loadModulesPromise: Promise<void> | null = null;

    async onLoad() {
        if (SuiManager.instance) {
            this.destroy();
            return;
        }
        SuiManager.instance = this;

        try {
            // 输出安全警告
            this._printSecurityWarnings();

            // 清理过期的 Session Keys
            this._cleanupExpiredSessions();

            // 动态导入所需模块（只在运行时加载）
            await this.loadModules();

            // 初始化 Sui Client
            const { SuiClient, getFullnodeUrl } = this._suiModules;
            const rpcUrl = getFullnodeUrl(NETWORK);
            this.client = new SuiClient({ url: rpcUrl });

            // 初始化 Passkey Provider
            const { BrowserPasskeyProvider } = this._suiModules;
            if (BrowserPasskeyProvider) {
                // 检查浏览器是否支持 WebAuthn
                if (typeof window !== 'undefined' && window.PublicKeyCredential) {
                    // 🔑 配置 BrowserPasskeyProvider，确保创建本地 Passkey
                    const passkeyOptions = {
                        // 指定使用平台认证器（设备本地的 Face ID / Touch ID）
                        authenticatorAttachment: 'platform',
                        // 要求用户验证（生物识别）
                        userVerification: 'required',
                        // 要求创建可发现凭证（resident key）
                        residentKey: 'required'
                    };

                    this.passkeyProvider = new BrowserPasskeyProvider('Gold Game Passkey', passkeyOptions);
                    console.log('[SuiManager] ✅ Passkey Provider initialized successfully');
                    console.log('[SuiManager] 🔐 Biometric authentication available');
                    console.log('[SuiManager] 📱 Passkey options:', passkeyOptions);
                } else {
                    console.warn('[SuiManager] ⚠️ WebAuthn not supported in this browser');
                    console.warn('[SuiManager] Passkey login will not be available');
                }
            } else {
                console.error('[SuiManager] ❌ BrowserPasskeyProvider not found in dubhe.js');
                console.error('[SuiManager] Please update dubhe.js to include Passkey support');
            }

            console.log('[SuiManager] Initialized with network:', NETWORK);
        } catch (e) {
            console.error('[SuiManager] Initialization failed:', e);
            throw e;
        }
    }

    /**
     * 确保 SuiManager 实例存在，如果不存在则创建
     * 这个方法消除了重复的初始化代码
     * @returns SuiManager 实例
     */
    static async ensureInstance(): Promise<SuiManager> {
        // 如果实例已存在，直接返回
        if (SuiManager.instance) {
            return SuiManager.instance;
        }

        // 动态导入 find 和 Node，避免编译时依赖
        const { find, Node } = await import('cc');

        // 查找 Canvas
        const canvas = find('Canvas');
        if (!canvas) {
            throw new Error('[SuiManager] Canvas 未找到');
        }

        // 查找或创建 SuiManager 节点
        let suiManagerNode = canvas.getChildByName('SuiManager');
        if (!suiManagerNode) {
            suiManagerNode = new Node('SuiManager');
            suiManagerNode.setParent(canvas);
        }

        // 获取或添加 SuiManager 组件
        let suiManager = suiManagerNode.getComponent(SuiManager);
        if (!suiManager) {
            suiManager = suiManagerNode.addComponent(SuiManager);
            // 等待组件初始化完成
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return suiManager;
    }

    /**
     * 输出安全警告（仅在开发环境）
     */
    private _printSecurityWarnings() {
        console.warn('='.repeat(80));
        console.warn('[SuiManager] 🔐 SECURITY WARNING');
        console.warn('='.repeat(80));
        console.warn('• Session Keys are stored in localStorage (not encrypted)');
        console.warn('• Do NOT share your device or browser with untrusted parties');
        console.warn('• Session Keys will expire after 24 hours');
        console.warn('• Clear browser data will invalidate your session');
        console.warn('• For production, consider using hardware wallets or MPC solutions');
        console.warn('='.repeat(80));
    }

    /**
     * 清理过期的 Session Keys
     */
    private _cleanupExpiredSessions() {
        try {
            const expiresAtStr = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
            if (expiresAtStr) {
                const expiresAt = parseInt(expiresAtStr, 10);
                const now = Date.now();

                if (now > expiresAt) {
                    console.warn('[SuiManager] ⏰ Session expired, cleaning up...');
                    this.clearSession();
                } else {
                    const remainingMs = expiresAt - now;
                    const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
                    console.log(`[SuiManager] ✅ Session valid for ${remainingHours} more hours`);

                    // 如果快过期了，发出警告
                    if (remainingMs < SESSION_ROTATION_WARNING_MS) {
                        console.warn('[SuiManager] ⚠️ Session expiring soon! Please rotate your session key.');
                    }
                }
            }
        } catch (e) {
            console.error('[SuiManager] Failed to cleanup expired sessions:', e);
        }
    }

    /**
     * 检查 Session 是否过期
     * @returns true 如果 session 有效，false 如果已过期
     */
    private _isSessionValid(): boolean {
        try {
            const expiresAtStr = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
            if (!expiresAtStr) {
                return false; // 没有过期时间，认为无效
            }

            const expiresAt = parseInt(expiresAtStr, 10);
            const now = Date.now();

            return now < expiresAt;
        } catch (e) {
            console.error('[SuiManager] Failed to check session validity:', e);
            return false;
        }
    }

    /**
     * 动态加载所需模块（只在运行时）
     */
    private async loadModules() {
        // 如果已经加载完成，直接返回
        if (this._suiModules) {
            return;
        }

        // 如果正在加载中，等待加载完成
        if (this._loadModulesPromise) {
            await this._loadModulesPromise;
            return;
        }

        console.log('[SuiManager] 🚀 Starting module load...');

        // 创建加载 Promise
        this._loadModulesPromise = this._doLoadModules();

        try {
            await this._loadModulesPromise;
            console.log('[SuiManager] ✅ loadModules completed successfully');
        } catch (error) {
            console.error('[SuiManager] ❌ loadModules failed:', error);
            this._suiModules = null; // Reset on error
            throw error;
        } finally {
            this._loadModulesPromise = null;
            console.log('[SuiManager] Cleared _loadModulesPromise');
        }
    }

    /**
     * 实际执行模块加载的内部方法
     */
    private async _doLoadModules() {
        // 检查全局 dubhe 是否可用
        const win = window as any;
        if (!win.dubhe) {
            throw new Error('dubhe.js not loaded! Make sure dubhe.js is loaded before this script.');
        }

        // 确保 Buffer 已经加载并可用（dubhe.js 包含了 Buffer polyfill）
        if (typeof window !== 'undefined') {

            // 尝试预加载 Buffer
            if (win.Buffer === undefined || !win.Buffer.isEncoding) {
                try {
                    // @ts-ignore - Cocos Creator 支持 CommonJS require
                    const bufferModule = require('buffer');
                    if (bufferModule && bufferModule.Buffer) {
                        win.Buffer = bufferModule.Buffer;
                    }
                } catch (e) {
                    console.warn('[SuiManager] Failed to pre-load Buffer:', e);
                }
            }

            // 验证 Buffer.isEncoding 是否可用，如果没有则手动添加
            if (win.Buffer && typeof win.Buffer.isEncoding !== 'function') {
                win.Buffer.isEncoding = (encoding: string) => {
                    if (!encoding) return false;
                    const validEncodings = ['utf8', 'utf-8', 'hex', 'base64', 'ascii', 'binary', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'latin1'];
                    return validEncodings.includes(String(encoding).toLowerCase());
                };
            }
        }

        // 直接从 window.dubhe 获取所需的类
        const dubheGlobal = win.dubhe;

        // 从 dubhe 全局对象中解构所需的类型
        const {
            Ed25519Keypair,
            SuiClient,
            getFullnodeUrl,
            Transaction,
            SUI_CLOCK_OBJECT_ID,
            Dubhe,
            loadMetadata, // 🔑 添加 loadMetadata
            // 尝试获取 Passkey 相关（如果 dubhe.js 包含的话）
            PasskeyKeypair,
            PasskeyPublicKey,
            BrowserPasskeyProvider,
            requestSuiFromFaucetV1,
            getFaucetHost
        } = dubheGlobal;

        console.log('[SuiManager] ✓ Classes extracted successfully');
        console.log('[SuiManager] Available:', {
            Ed25519Keypair: !!Ed25519Keypair,
            SuiClient: !!SuiClient,
            Dubhe: !!Dubhe,
            loadMetadata: !!loadMetadata,
            Transaction: !!Transaction,
            PasskeyKeypair: !!PasskeyKeypair,
            PasskeyPublicKey: !!PasskeyPublicKey,
            BrowserPasskeyProvider: !!BrowserPasskeyProvider,
            requestSuiFromFaucetV1: !!requestSuiFromFaucetV1
        });

        // 检查并标记 Passkey 可用性
        const passkeyAvailable = !!(PasskeyKeypair && BrowserPasskeyProvider);

        if (!passkeyAvailable) {
            console.warn('[SuiManager] ⚠️ ================================');
            console.warn('[SuiManager] ⚠️ Passkey 功能不可用！');
            console.warn('[SuiManager] ⚠️ dubhe.js 不包含 PasskeyKeypair 和 BrowserPasskeyProvider');
            console.warn('[SuiManager] ⚠️ 请使用以下替代方案：');
            console.warn('[SuiManager] ⚠️   1. 游客模式（Skip 按钮）');
            console.warn('[SuiManager] ⚠️   2. 钱包扩展（Sui Wallet、Suiet）');
            console.warn('[SuiManager] ⚠️   3. 或联系作者获取包含 Passkey 的完整版 dubhe.js');
            console.warn('[SuiManager] ⚠️ ================================');
        } else {
            console.log('[SuiManager] ✅ Passkey 功能可用！');
        }

        console.log('[SuiManager] 💾 Setting _suiModules...');
        this._suiModules = {
            Ed25519Keypair,
            SuiClient,
            getFullnodeUrl,
            Transaction,
            PasskeyKeypair,
            PasskeyPublicKey,
            BrowserPasskeyProvider,
            SUI_CLOCK_OBJECT_ID,
            requestSuiFromFaucetV1,
            getFaucetHost,
            Dubhe,
            loadMetadata // 🔑 添加到模块对象中
        };
        console.log('[SuiManager] ✓ _suiModules set successfully');

        // 初始化 Dubhe client
        console.log('[SuiManager] 🔧 Initializing Dubhe client...');
        try {
            await this.initDubheClient();
            console.log('[SuiManager] ✓ Dubhe client initialized');
            console.log('[SuiManager] ✓ Dubhe current address:', this.dubhe?.currentAddress());
        } catch (e) {
            console.error('[SuiManager] ❌ CRITICAL: Failed to initialize Dubhe client:', e);
            // Dubhe 初始化失败是严重问题，必须抛出错误
            throw new Error(`Dubhe client initialization failed: ${e instanceof Error ? e.message : String(e)}`);
        }

        // 初始化 gRPC client
        console.log('[SuiManager] 🔧 Initializing gRPC client...');
        try {
            await this.initGrpcClient();
            console.log('[SuiManager] ✓ gRPC client initialized');
        } catch (e) {
            console.warn('[SuiManager] ⚠️ Failed to initialize gRPC client:', e);
        }

        console.log('[SuiManager] ✅ All modules loaded successfully');
        console.log('[SuiManager] Final Buffer check - isEncoding available:', !!(window as any).Buffer?.isEncoding);
    }

    /**
     * 初始化 Dubhe 客户端
     */
    private async initDubheClient() {
        if (this.dubhe) return;

        try {
            const { Dubhe, loadMetadata } = this._suiModules;

            // 获取 RPC URL
            const rpcUrl = NETWORK === 'localnet'
                ? 'http://127.0.0.1:9000'
                : this._suiModules.getFullnodeUrl(NETWORK);

            console.info('[SuiManager] 📦 Loading contract metadata from chain...');

            // 检查 loadMetadata 是否可用
            if (!loadMetadata || typeof loadMetadata !== 'function') {
                console.error('[SuiManager] ❌ loadMetadata is not available in window.dubhe');
                console.error('[SuiManager] Available keys:', Object.keys(this._suiModules));
                throw new Error('loadMetadata is not a function. Please check dubhe.js exports.');
            }

            // 从链上加载合约 metadata（包含所有模块和函数信息）
            const metadata = await loadMetadata(NETWORK, PACKAGE_ID, [rpcUrl]);

            if (!metadata) {
                throw new Error('Failed to load contract metadata from chain');
            }

            console.info('[SuiManager] ✅ Metadata loaded. Available modules:', Object.keys(metadata).join(', '));

            // 初始化 Dubhe（使用 session keypair 如果存在，否则创建临时密钥）
            let secretKey: string | undefined = undefined;

            // 如果有 session keypair，使用它
            if (this.sessionKeypair) {
                secretKey = this.sessionKeypair.getSecretKey();
            }

            this.dubhe = new Dubhe({
                networkType: NETWORK as any,
                fullnodeUrls: [rpcUrl],
                packageId: PACKAGE_ID,
                metadata: metadata, // 🔑 关键：传递 metadata
                secretKey: secretKey
            });

            console.log('[SuiManager] Dubhe client initialized for network:', NETWORK);
            console.log('[SuiManager] Dubhe address:', this.dubhe.currentAddress());

            // 验证 tx 对象是否正确初始化
            if (this.dubhe.tx && Object.keys(this.dubhe.tx).length > 0) {
                console.info('[SuiManager] ✅ Transaction builder ready. Available systems:', Object.keys(this.dubhe.tx).join(', '));
            } else {
                console.warn('[SuiManager] ⚠️ Warning: dubhe.tx is empty, no functions available');
            }
        } catch (error) {
            console.error('[SuiManager] Failed to initialize Dubhe client:', error);
            throw error;
        }
    }

    /**
     * 初始化 gRPC 客户端
     */
    private async initGrpcClient() {
        if (this.grpcClient) return;

        try {
            const { DubheGrpcClient } = await import('@0xobelisk/grpc-client');

            // DubheGrpcClient 接受 GrpcWebOptions 配置对象
            this.grpcClient = new DubheGrpcClient({
                baseUrl: GRPC_ENDPOINT,
                format: 'binary'
            });
            console.log('[SuiManager] gRPC client initialized with endpoint:', GRPC_ENDPOINT);
        } catch (error) {
            console.error('[SuiManager] Failed to initialize gRPC client:', error);
            throw error;
        }
    }

    // ========== Faucet 功能 ==========

    /**
     * 确保地址有足够的 Gas 费（检查余额，不足则请求 faucet）
     */
    private async ensureFaucetForAddress(address: string): Promise<void> {
        if (NETWORK !== 'localnet' && NETWORK !== 'devnet' && NETWORK !== 'testnet') {
            console.warn('[SuiManager] Faucet only available on localnet/devnet/testnet');
            return;
        }

        try {
            // 检查地址余额
            const balance = await this.client.getBalance({ owner: address });
            const balanceNum = BigInt(balance.totalBalance);

            console.log(`[SuiManager] Address ${address.slice(0, 10)}... balance: ${balanceNum}`);

            // 如果余额小于 0.1 SUI (100000000 MIST)，请求 faucet
            if (balanceNum < 100000000n) {
                console.log('[SuiManager] Balance insufficient, requesting faucet...');
                await this.requestFaucet(address);

                // 轮询检查余额，最多等待 10 秒
                let attempts = 0;
                const maxAttempts = 5;
                while (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const newBalance = await this.client.getBalance({ owner: address });
                    const newBalanceNum = BigInt(newBalance.totalBalance);

                    console.log(`[SuiManager] Checking balance (attempt ${attempts + 1}/${maxAttempts}): ${newBalance.totalBalance}`);

                    if (newBalanceNum > 0n) {
                        console.log('[SuiManager] ✅ Faucet successful! New balance:', newBalance.totalBalance);
                        return;
                    }

                    attempts++;
                }

                console.warn('[SuiManager] ⚠️ Faucet may have failed - balance still 0 after 10 seconds');
            } else {
                console.log('[SuiManager] ✅ Balance sufficient, no faucet needed');
            }
        } catch (error) {
            console.warn('[SuiManager] Faucet check failed, trying to request anyway:', error);
            await this.requestFaucet(address);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    /**
     * 请求 faucet 为指定地址打币
     */
    private async requestFaucet(address: string): Promise<void> {
        if (NETWORK !== 'localnet' && NETWORK !== 'devnet' && NETWORK !== 'testnet') {
            console.warn('[SuiManager] Faucet only available on localnet/devnet/testnet');
            return;
        }

        try {
            // 使用 Dubhe 的 requestFaucet 方法
            if (this.dubhe && typeof this.dubhe.requestFaucet === 'function') {
                console.log('[SuiManager] Requesting faucet via Dubhe for:', address);
                console.log('[SuiManager] Network:', NETWORK);

                // Dubhe.requestFaucet(address?, network?)
                await this.dubhe.requestFaucet(
                    address,
                    NETWORK as 'localnet' | 'devnet' | 'testnet'
                );

                console.log('[SuiManager] ✅ Faucet request sent successfully');
            } else {
                // 回退到使用 @mysten/sui 的 faucet 方法（V0，不是 V1）
                const { requestSuiFromFaucetV0, getFaucetHost } = this._suiModules;

                if (!requestSuiFromFaucetV0 || !getFaucetHost) {
                    throw new Error('Faucet functions not available');
                }

                const host = getFaucetHost(NETWORK as 'localnet' | 'devnet' | 'testnet');
                console.log('[SuiManager] Faucet host:', host);
                console.log('[SuiManager] Requesting faucet (fallback) for:', address);

                await requestSuiFromFaucetV0({ host, recipient: address });
                console.log('[SuiManager] ✅ Faucet success (fallback)');
            }
        } catch (error) {
            console.warn('[SuiManager] ❌ Faucet request failed');
            console.warn('[SuiManager] Error:', error);

            if (error instanceof Error) {
                console.warn('[SuiManager] Error message:', error.message);
                console.warn('[SuiManager] Error stack:', error.stack);
            }

            // 提供手动解决方案
            console.log('[SuiManager] 💡 Localnet faucet might not be running.');
            console.log('[SuiManager] 💡 Manual fix: Run this command in terminal:');
            console.log(`    sui client faucet ${address}`);
            console.log('[SuiManager] 💡 Or start localnet with: sui start');
        }
    }

    // ========== Passkey 管理 ==========

    /**
     * Base64 URL 编码
     */
    private toBase64Url(bytes: Uint8Array): string {
        const bin = String.fromCharCode(...bytes);
        return btoa(bin)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * Base64 URL 解码
     */
    private fromBase64Url(b64url: string): Uint8Array {
        const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
        const str = atob(b64 + pad);
        return Uint8Array.from(str, (c) => c.charCodeAt(0));
    }

    /**
     * 从缓存加载 Passkey
     */
    private loadCachedPasskey(): PasskeyKeypair | null {
        if (this.passkeyKeypair) return this.passkeyKeypair;
        if (typeof window === 'undefined') return null;

        try {
            const cached = localStorage.getItem(PASSKEY_CACHE_KEY);
            if (!cached) return null;

            const pub = this.fromBase64Url(cached);
            const { PasskeyKeypair } = this._suiModules;
            const kp = new PasskeyKeypair(pub, this.passkeyProvider);
            console.info('[SuiManager] Loaded cached passkey');
            this.passkeyKeypair = kp;
            return kp;
        } catch (e) {
            console.warn('[SuiManager] Failed to load cached passkey:', e);
            return null;
        }
    }

    /**
     * 恢复已存在的 Passkey（通过签名两次消息来推导公钥）
     */
    private async recoverPasskey(): Promise<PasskeyKeypair | null> {
        try {
            console.info('[SuiManager] Recovering passkey...');
            const { PasskeyKeypair } = this._suiModules;
            const encoder = new TextEncoder();
            const msg1 = encoder.encode('Gold Game passkey recover 1');
            const msg2 = encoder.encode('Gold Game passkey recover 2');

            const pks1 = await PasskeyKeypair.signAndRecover(
                this.passkeyProvider,
                msg1
            ).catch(() => []);
            const pks2 = await PasskeyKeypair.signAndRecover(
                this.passkeyProvider,
                msg2
            ).catch(() => []);

            console.info('[SuiManager] Recover candidates:', pks1.length, pks2.length);

            const common = pks1.find((pk1: any) => pks2.some((pk2: any) => pk1.equals(pk2)));
            const pick = common ?? pks1[0] ?? pks2[0];

            if (!pick) {
                console.warn('[SuiManager] No passkey recovered');
                return null;
            }

            console.info('[SuiManager] Recovered passkey address:', pick.toSuiAddress());
            const kp = new PasskeyKeypair(pick.toRawBytes(), this.passkeyProvider);

            // 缓存公钥
            try {
                localStorage.setItem(PASSKEY_CACHE_KEY, this.toBase64Url(pick.toRawBytes()));
            } catch (e) {
                console.warn('[SuiManager] Failed to cache passkey:', e);
            }

            this.passkeyKeypair = kp;
            return kp;
        } catch (e) {
            console.error('[SuiManager] Passkey recovery failed:', e);
            return null;
        }
    }

    /**
     * 确保 Passkey 存在（加载缓存、恢复或创建新的）
     */
    public async ensurePasskey(): Promise<PasskeyKeypair> {
        await this.loadModules();

        // 检查 Passkey 功能是否可用
        const { PasskeyKeypair, BrowserPasskeyProvider } = this._suiModules;
        if (!PasskeyKeypair || !BrowserPasskeyProvider) {
            const error = new Error(
                'Passkey 功能不可用！\n\n' +
                '原因：dubhe.js 不包含 PasskeyKeypair 和 BrowserPasskeyProvider\n\n' +
                '解决方案：\n' +
                '1. 使用"跳过登录"按钮（游客模式）\n' +
                '2. 使用钱包扩展（Sui Wallet 或 Suiet）\n' +
                '3. 联系开发者获取包含 Passkey 的完整版 dubhe.js'
            );
            console.error('[SuiManager]', error.message);
            throw error;
        }

        let keypair: PasskeyKeypair | null = null;

        // 1. 尝试从缓存加载
        const cached = this.loadCachedPasskey();
        if (cached) {
            console.info('[SuiManager] Using cached passkey');
            keypair = cached;
        } else {
            // 2. 尝试恢复已存在的 passkey
            console.info('[SuiManager] Trying to recover passkey...');
            const recovered = await this.recoverPasskey();
            if (recovered) {
                console.info('[SuiManager] Passkey recovered successfully');
                keypair = recovered;
            } else {
                // 3. 创建新的 passkey
                console.info('[SuiManager] Creating new passkey...');
                try {
                    if (!this.passkeyProvider) {
                        throw new Error('Passkey provider not initialized');
                    }

                    // 🔑 iOS Safari 修复：在调用 WebAuthn 前确保 document 有焦点
                    // 注意：必须同步执行，不能有 await 延迟，否则会失去用户手势上下文
                    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                        try {
                            console.info('[SuiManager] Ensuring document focus for iOS Safari...');
                            console.info('[SuiManager] Document hasFocus:', document.hasFocus?.());
                            console.info('[SuiManager] Document activeElement:', document.activeElement?.tagName);
                            console.info('[SuiManager] Window location:', window.location.href);
                            console.info('[SuiManager] Is HTTPS:', window.location.protocol === 'https:');

                            window.focus();
                            if (document.body) {
                                document.body.focus();
                            }

                            console.info('[SuiManager] After focus - Document hasFocus:', document.hasFocus?.());
                        } catch (focusError) {
                            console.warn('[SuiManager] Failed to focus document:', focusError);
                        }
                    }

                    // 立即调用 WebAuthn API，保持在用户手势上下文中
                    console.info('[SuiManager] ========================================');
                    console.info('[SuiManager] 🔐 Calling PasskeyKeypair.getPasskeyInstance (WebAuthn)...');
                    console.info('[SuiManager] Provider:', this.passkeyProvider);
                    console.info('[SuiManager] ========================================');

                    try {
                        keypair = await PasskeyKeypair.getPasskeyInstance(this.passkeyProvider);
                        console.info('[SuiManager] ✅ Passkey created successfully!');
                    } catch (passkeyError: any) {
                        console.error('[SuiManager] ❌ Passkey creation failed!');
                        console.error('[SuiManager] Error name:', passkeyError?.name);
                        console.error('[SuiManager] Error message:', passkeyError?.message);
                        console.error('[SuiManager] Error stack:', passkeyError?.stack);
                        throw passkeyError;
                    }

                    // 缓存公钥
                    try {
                        const pub = keypair.getPublicKey().toRawBytes();
                        localStorage.setItem(PASSKEY_CACHE_KEY, this.toBase64Url(pub));
                    } catch (e) {
                        console.warn('[SuiManager] Failed to cache new passkey:', e);
                    }

                    this.passkeyKeypair = keypair;
                    const address = keypair.getPublicKey().toSuiAddress();
                    console.info('[SuiManager] New passkey created:', address);
                } catch (e) {
                    console.error('[SuiManager] Failed to create passkey:', e);
                    throw new Error(`创建 Passkey 失败: ${e instanceof Error ? e.message : String(e)}`);
                }
            }
        }

        // 统一处理：检查余额，如果不足则请求 faucet（仅 localnet）
        const address = keypair.getPublicKey().toSuiAddress();
        if (NETWORK === 'localnet') {
            await this.ensureFaucetForAddress(address);
        } else {
            console.info('[SuiManager] 💡 Passkey address created. Please request faucet manually on testnet/mainnet.');
            console.info('[SuiManager] 💡 Visit: https://faucet.sui.io/ or use Discord bot');
        }

        return keypair;
    }

    /**
     * 获取 Passkey 地址
     */
    public getPasskeyAddress(): string | null {
        if (!this.passkeyKeypair) return null;
        return this.passkeyKeypair.getPublicKey().toSuiAddress();
    }

    /**
     * 清除 Passkey 缓存（用于切换网络或重新创建 Passkey）
     */
    public clearPasskeyCache(): void {
        try {
            this.passkeyKeypair = null;
            localStorage.removeItem(PASSKEY_CACHE_KEY);
            console.info('[SuiManager] ✅ Passkey cache cleared');
            console.info('[SuiManager] 💡 Please call ensurePasskey() to create a new Passkey');
        } catch (e) {
            console.error('[SuiManager] ❌ Failed to clear passkey cache:', e);
        }
    }

    // ========== Session Key 管理 ==========

    /**
     * 确保 Session Keypair 存在（从 localStorage 加载或新建）
     */
    public async ensureSessionKeypair(): Promise<Ed25519Keypair> {
        await this.loadModules();

        // 如果已经有 session keypair，检查是否过期
        if (this.sessionKeypair) {
            if (this._isSessionValid()) {
                return this.sessionKeypair;
            } else {
                console.warn('[SuiManager] ⏰ Session expired, creating new session...');
                this.sessionKeypair = null; // 清除过期的 session
                await this.clearSession();
            }
        }

        const { Ed25519Keypair } = this._suiModules;

        // 尝试从 localStorage 加载（并验证有效期）
        try {
            const cached = localStorage.getItem(SESSION_PRIVATE_KEY);
            if (cached && this._isSessionValid()) {
                // 解码 base64 得到 Bech32 私钥字符串
                const bech32Key = this.base64ToString(cached);
                const kp = Ed25519Keypair.fromSecretKey(bech32Key);
                this.sessionKeypair = kp;
                console.info('[SuiManager] ✅ Loaded valid session keypair from localStorage');
                return kp;
            } else if (cached) {
                console.warn('[SuiManager] ⏰ Cached session expired, creating new one...');
                await this.clearSession();
            }
        } catch (e) {
            console.warn('[SuiManager] Failed to load session keypair from localStorage:', e);
        }

        // 创建新的 session keypair
        const kp = new Ed25519Keypair();
        const bech32Key = kp.getSecretKey();
        const b64 = this.stringToBase64(bech32Key);

        try {
            // 保存私钥和时间戳
            const now = Date.now();
            const expiresAt = now + SESSION_MAX_AGE_MS;

            localStorage.setItem(SESSION_PRIVATE_KEY, b64);
            localStorage.setItem(SESSION_CREATED_AT_KEY, now.toString());
            localStorage.setItem(SESSION_EXPIRES_AT_KEY, expiresAt.toString());

            console.info('[SuiManager] ✅ Saved new session keypair to localStorage');
            console.info(`[SuiManager] 📅 Session valid until: ${new Date(expiresAt).toLocaleString()}`);
        } catch (e) {
            console.error('[SuiManager] ❌ Failed to save session keypair to localStorage:', e);
        }

        this.sessionKeypair = kp;
        const sessionAddress = kp.getPublicKey().toSuiAddress();
        console.info('[SuiManager] 🔑 New session keypair created:', sessionAddress);

        // 确保 Session Key 地址有足够的 Gas 费（仅 localnet）
        if (NETWORK === 'localnet') {
            await this.ensureFaucetForAddress(sessionAddress);
        } else {
            console.info('[SuiManager] 💡 Session address created. Please transfer gas manually on testnet/mainnet.');
        }

        return kp;
    }

    /**
     * 清除 Session Key
     */
    public async clearSession(): Promise<void> {
        try {
            this.sessionKeypair = null;
            localStorage.removeItem(SESSION_PRIVATE_KEY);
            localStorage.removeItem(SESSION_OWNER_KEY);
            localStorage.removeItem(SESSION_AUTH_KEY);
            localStorage.removeItem(SESSION_READY_FLAG);
            localStorage.removeItem(SESSION_CREATED_AT_KEY);
            localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
            console.info('[SuiManager] ✅ Session cleared');
        } catch (e) {
            console.error('[SuiManager] ❌ Failed to clear session:', e);
        }
    }

    /**
     * 获取 Session Key 地址
     */
    public getSessionAddress(): string | null {
        if (!this.sessionKeypair) return null;
        return this.sessionKeypair.getPublicKey().toSuiAddress();
    }

    /**
     * 获取指定地址的余额
     * @param address Sui 地址
     * @returns 余额信息对象，包含 totalBalance 等字段
     */
    public async getBalance(address: string): Promise<any> {
        if (!this.client) {
            throw new Error('SuiClient not initialized');
        }

        try {
            console.log('[SuiManager] Querying balance for address:', address);
            const balance = await this.client.getBalance({ owner: address });
            console.log('[SuiManager] Balance query successful:', balance);
            return balance;
        } catch (error) {
            console.error('[SuiManager] Balance query failed:', error);
            throw new Error(`无法查询余额: ${error instanceof Error ? error.message : '网络错误'}`);
        }
    }

    /**
     * 检查 Session 是否在链上存在且有效
     * @returns true 如果 Session 存在且有效
     */
    public async checkSessionExists(): Promise<boolean> {
        try {
            // 检查本地是否有 Session 信息
            const sessionOwner = localStorage.getItem(SESSION_OWNER_KEY);
            const sessionAuthKey = localStorage.getItem(SESSION_AUTH_KEY);
            const sessionReady = localStorage.getItem(SESSION_READY_FLAG);

            if (!sessionOwner || !sessionAuthKey || sessionReady !== 'true') {
                console.log('[SuiManager] No session info in localStorage');
                return false;
            }

            // 检查 Session 是否过期
            if (!this._isSessionValid()) {
                console.log('[SuiManager] Session expired');
                return false;
            }

            // TODO: 可以在这里添加链上查询，确认 Session 是否真实存在
            // 目前仅检查本地状态和过期时间
            console.log('[SuiManager] Session exists and valid (local check)');
            return true;
        } catch (e) {
            console.error('[SuiManager] Failed to check session:', e);
            return false;
        }
    }

    // ========== 链上 Session 创建 ==========

    /**
     * 创建链上 Session
     * @returns Transaction digest
     */
    public async createOnchainSession(): Promise<string> {
        await this.loadModules();

        const { Transaction: TxClass, SUI_CLOCK_OBJECT_ID } = this._suiModules;

        // 1. 确保 Passkey 存在
        const passkeyKp = await this.ensurePasskey();
        const sender = passkeyKp.getPublicKey().toSuiAddress();
        console.info('[SuiManager] Creating session with owner:', sender);

        // 2. 确保 Session Keypair 存在
        const sessionKp = await this.ensureSessionKeypair();
        const sessionAuthKey = sessionKp.getPublicKey().toBase64();

        // 3. 缓存 session 信息
        try {
            localStorage.setItem(SESSION_OWNER_KEY, sender);
            localStorage.setItem(SESSION_AUTH_KEY, sessionAuthKey);
            localStorage.setItem(SESSION_READY_FLAG, 'true');
        } catch (e) {
            console.warn('[SuiManager] Failed to cache session info:', e);
        }

        // 4. 确保账户有足够的 Gas（仅 localnet 上请求 faucet）
        if (NETWORK === 'localnet') {
            try {
                await this.ensureFaucetForAddress(sender);
            } catch (e) {
                console.warn('[SuiManager] Faucet request failed:', e);
                // 继续尝试创建 Session，可能账户已经有足够的 gas
            }
        }

        // 5. 清理旧的 Session（只在确实需要时）
        console.info('[SuiManager] Checking for existing session...');
        const cachedOwner = localStorage.getItem(SESSION_OWNER_KEY);

        // 只在以下情况下清除旧 Session：
        // 1. localStorage 中有旧 Session 记录
        // 2. 且旧 Session 的 owner 与当前 owner 一致（说明是同一个用户的旧 Session）
        if (cachedOwner && cachedOwner === sender) {
            console.info('[SuiManager] Found old session for same owner, clearing...');
            try {
                await this._clearOldSession(sender);
            } catch (clearError) {
                console.warn('[SuiManager] Failed to clear old session:', clearError);
                // 清除失败也继续，可能旧 Session 已经不存在了
            }
        } else {
            console.info('[SuiManager] No old session to clear or different owner');
        }

        // 6. 创建新的 session 并转账 Gas（合并到一个交易中）
        const tx = new TxClass();

        try {
            // 计算过期时间戳（当前时间 + 2小时）
            const expiresAt = Date.now() + 7_200_000; // 2 hours from now

            console.info('[SuiManager] Session params:', {
                owner: sender,
                authKey: sessionAuthKey.slice(0, 20) + '...',
                maxInactiveInterval: 7_200_000,
                expiresAt: new Date(expiresAt).toISOString(),
                gasCostPerTx: 5_000_000,
                gasThreshold: 100_000_000
            });

            // 🔑 步骤1：创建 Session
            const txParams = [
                tx.object(SCHEMA_ID),                   // schema_id (链上对象)
                tx.pure.address(sender),                // owner
                tx.pure.string(sessionAuthKey),         // authentication_key (String 类型)
                tx.pure.u64(7_200_000),                 // max_inactive_interval (2 小时 = 7200 秒 = 7200000 毫秒)
                tx.pure.u64(expiresAt),                 // expires_at (绝对时间戳)
                tx.pure.u64(5_000_000),                 // gas_coin_cost_per_tx (0.005 SUI)
                tx.pure.u64(100_000_000),               // gas_coin_balance_threshold (0.1 SUI)
                tx.object(SUI_CLOCK_OBJECT_ID)          // clock (object 类型)
            ];

            await this.dubhe.tx.session_system.create_session({
                tx,
                params: txParams,
                isRaw: true
            });

            // 🔑 步骤2：在同一个交易中给 Session 地址转 Gas（0.2 SUI）
            const sessionAddr = sessionKp.getPublicKey().toSuiAddress();
            const transferAmount = 200_000_000n; // 0.2 SUI
            const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(transferAmount)]);
            tx.transferObjects([coin], tx.pure.address(sessionAddr));

            console.info('[SuiManager] Session transaction built (with gas transfer), signing with Passkey...');

            // 使用 Passkey 签名并执行交易
            let result;
            try {
                result = await this.signAndExecuteWithPasskey(tx);
                console.info('[SuiManager] 📋 Transaction result:', result);
            } catch (signError) {
                console.error('[SuiManager] ❌ Failed to sign/execute session creation transaction:', signError);
                throw new Error(`Session 创建失败：签名或执行交易时出错 - ${signError instanceof Error ? signError.message : String(signError)}`);
            }

            if (result && result.digest) {
                console.info('[SuiManager] ✅ Session created successfully (with gas transfer):', result.digest);

                // 等待交易确认
                await this.dubhe.waitForTransaction(result.digest);
                console.info('[SuiManager] ✅ Session transaction confirmed');

                // 验证 Session 地址的 gas 余额
                const sessionAddr = sessionKp.getPublicKey().toSuiAddress();
                try {
                    const balance = await this.client.getBalance({ owner: sessionAddr });
                    const balanceNum = BigInt(balance.totalBalance);
                    console.info('[SuiManager] 💰 Session address balance:', (Number(balanceNum) / 1_000_000_000).toFixed(4), 'SUI');

                    if (balanceNum < 500_000_000n) {
                        console.warn('[SuiManager] ⚠️ Session gas might be insufficient');
                    } else {
                        console.info('[SuiManager] ✅ Session gas transfer verified');
                    }
                } catch (balanceError) {
                    console.warn('[SuiManager] Could not verify session balance:', balanceError);
                }

                return result.digest;
            } else {
                throw new Error('Transaction digest not available');
            }
        } catch (e) {
            console.error('[SuiManager] ❌ Failed to create session:', e);

            // 提供更详细的错误信息
            if (e instanceof Error) {
                if (e.message.includes('Insufficient gas')) {
                    throw new Error('余额不足，无法创建 Session。请先获取测试币。');
                }
            }

            throw e;
        }
    }

    // ========== 交易签名 ==========

    /**
     * 清理旧的 Session（如果存在）
     * @param owner Passkey 地址
     */
    private async _clearOldSession(owner: string): Promise<void> {
        console.info('[SuiManager] Attempting to clear old session for:', owner);

        const { Transaction: TxClass } = this._suiModules;
        const tx = new TxClass();

        // 调用 session_system::clear_session
        await this.dubhe.tx.session_system.clear_session({
            tx,
            params: [tx.object(SCHEMA_ID)],
            isRaw: true
        });

        // 使用 Passkey 签名并执行
        const result = await this.signAndExecuteWithPasskey(tx);

        if (result && result.digest) {
            console.info('[SuiManager] ✅ Old session cleared:', result.digest);
            await this.dubhe.waitForTransaction(result.digest);
        }
    }

    /**
     * 字符串转 Base64（浏览器兼容）
     */
    private stringToBase64(str: string): string {
        // 使用 TextEncoder 替代弃用的 unescape
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        const binString = Array.from(bytes, byte => String.fromCodePoint(byte)).join('');
        return btoa(binString);
    }

    /**
     * Base64 转字符串（浏览器兼容）
     */
    private base64ToString(base64: string): string {
        // 使用 TextDecoder 替代弃用的 escape
        const binString = atob(base64);
        const bytes = Uint8Array.from(binString, char => char.codePointAt(0)!);
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    }

    /**
     * 获取 Sui Client
     */
    public getClient(): SuiClient {
        return this.client;
    }

    /**
     * 获取网络配置
     */
    public getNetworkConfig() {
        return {
            network: NETWORK,
            packageId: PACKAGE_ID,
            schemaId: SCHEMA_ID
        };
    }

    // ==================== 钱包扩展相关方法 ====================

    /**
     * 检测是否安装了 Sui 钱包扩展
        const win = window as any;

        // 检测 Sui Wallet
        if (win.suiWallet) {
            console.log('[SuiManager] ✅ Detected Sui Wallet extension');
            return true;
        }

        // 检测 Suiet Wallet
        if (win.suiet) {
            console.log('[SuiManager] ✅ Detected Suiet Wallet extension');
            return true;
        }

        console.warn('[SuiManager] ⚠️ No Sui wallet extension detected');
        return false;
    }

    /**
     * 连接钱包扩展
     * @returns 钱包地址
     */
    public async connectWalletExtension(): Promise<string> {
        const win = window as any;

        try {
            // 优先尝试 Sui Wallet
            if (win.suiWallet) {
                console.log('[SuiManager] Connecting to Sui Wallet...');
                const result = await win.suiWallet.requestPermissions();

                if (result && result.accounts && result.accounts.length > 0) {
                    const address = result.accounts[0].address;
                    this.walletExtension = win.suiWallet;
                    this.walletAddress = address;
                    console.log('[SuiManager] ✅ Connected to Sui Wallet:', address);
                    return address;
                }
            }

            // 尝试 Suiet Wallet
            if (win.suiet) {
                console.log('[SuiManager] Connecting to Suiet Wallet...');
                const result = await win.suiet.connect();

                if (result && result.address) {
                    const address = result.address;
                    this.walletExtension = win.suiet;
                    this.walletAddress = address;
                    console.log('[SuiManager] ✅ Connected to Suiet Wallet:', address);
                    return address;
                }
            }

            throw new Error('未检测到钱包扩展，请先安装 Sui Wallet 或 Suiet Wallet');
        } catch (error) {
            console.error('[SuiManager] Failed to connect wallet:', error);
            throw error;
        }
    }

    /**
     * 获取钱包地址（如果已连接）
     */
    public getWalletAddress(): string | null {
        return this.walletAddress;
    }

    /**
     * 使用钱包扩展签名并执行交易
     * @param tx 交易对象
     * @returns 交易结果
     */
    public async signAndExecuteWithWallet(tx: Transaction): Promise<any> {
        if (!this.walletExtension || !this.walletAddress) {
            throw new Error('钱包未连接，请先调用 connectWalletExtension()');
        }

        try {
            console.log('[SuiManager] Signing transaction with wallet...');

            // Sui Wallet 和 Suiet 都支持 signAndExecuteTransactionBlock
            const result = await this.walletExtension.signAndExecuteTransactionBlock({
                transactionBlock: tx,
                options: {
                    showEffects: true,
                    showEvents: true,
                },
            });

            console.log('[SuiManager] ✅ Transaction executed:', result.digest);
            return result;
        } catch (error) {
            console.error('[SuiManager] Failed to sign transaction:', error);
            throw error;
        }
    }

    /**
     * 断开钱包连接
     */
    public disconnectWallet() {
        this.walletExtension = null;
        this.walletAddress = null;
        console.log('[SuiManager] Wallet disconnected');
    }

    /**
     * 获取当前活动的地址
     * 优先级：钱包扩展 > Passkey > Session
     */
    public getCurrentAddress(): string | null {
        // 优先使用钱包扩展地址
        if (this.walletAddress) {
            return this.walletAddress;
        }

        // 其次使用 Passkey 地址
        const passkeyAddr = this.getPasskeyAddress();
        if (passkeyAddr) {
            return passkeyAddr;
        }

        // 最后使用 Session 地址
        const sessionAddr = this.getSessionAddress();
        if (sessionAddr) {
            return sessionAddr;
        }

        return null;
    }

    // ==================== Discord Integration ====================

    /**
     * 绑定 Discord 用户到 Sui 地址
     * @returns 是否绑定成功
     */
    public async bindDiscordUser(): Promise<boolean> {
        const discordManager = DiscordManager.instance;

        // 检查是否在 Discord 环境中
        if (!discordManager.isInDiscord()) {
            console.log('[SuiManager] Not in Discord environment, skipping bind');
            return false;
        }

        // 检查 Discord 是否已准备就绪
        if (!discordManager.isReady()) {
            console.warn('[SuiManager] Discord not ready yet');
            return false;
        }

        const user = discordManager.getUser();
        if (!user) {
            console.error('[SuiManager] No Discord user found');
            return false;
        }

        // 获取当前 Sui 地址
        const suiAddress = this.getCurrentAddress();
        if (!suiAddress) {
            console.error('[SuiManager] No Sui address available for binding');
            return false;
        }

        try {
            console.log(`[SuiManager] Binding Discord user ${user.username} (${user.id}) to Sui address ${suiAddress}`);

            // 调用后端 API 保存绑定关系
            const response = await fetch('/api/discord/bind', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    discordId: user.id,
                    suiAddress: suiAddress
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('[SuiManager] Bind failed:', error);
                return false;
            }

            const result = await response.json();
            console.log('[SuiManager] Bind successful:', result);

            return true;
        } catch (error) {
            console.error('[SuiManager] Error binding Discord user:', error);
            return false;
        }
    }

    /**
     * 获取当前房间 ID
     * Discord 环境：基于 guildId 和 channelId
     * 普通环境：返回默认房间
     */
    public getCurrentRoomId(): string {
        const discordManager = DiscordManager.instance;

        if (discordManager.isInDiscord() && discordManager.isReady()) {
            return discordManager.getRoomId();
        }

        // 非 Discord 环境，返回默认房间
        return 'default-room';
    }

    /**
     * 获取 Discord 上下文信息
     * @returns Discord 上下文或 null
     */
    public getDiscordContext() {
        const discordManager = DiscordManager.instance;

        if (discordManager.isInDiscord() && discordManager.isReady()) {
            return discordManager.getContext();
        }

        return null;
    }

    /**
     * 检查是否在 Discord 环境中
     */
    public isInDiscord(): boolean {
        return DiscordManager.instance.isInDiscord();
    }

    /**
     * 获取 Discord 用户显示名称
     */
    public getDiscordDisplayName(): string | null {
        const discordManager = DiscordManager.instance;

        if (discordManager.isInDiscord() && discordManager.isReady()) {
            return discordManager.getUserDisplayName();
        }

        return null;
    }
}
