/**
 * @file LoginPanel.ts
 * @description 游戏登录界面，处理 Passkey、钱包扩展和 Discord 多种登录方式
 *
 * @module coinpusher/view
 *
 * @dependencies
 * - SuiManager.ts: Sui 区块链和钱包管理
 * - DiscordManager.ts: Discord 用户身份识别和绑定
 * - OOPS GUI: OOPS 框架 UI 系统
 *
 * @author UI Team
 * @created 2025-11-28
 *
 * @description
 * LoginPanel 是玩家进入游戏的第一个界面。
 * 主要功能：
 * - 自动检测是否在 Discord 环境中
 * - 提供三种登录方式：Passkey（生物识别）、钱包扩展、游客模式
 * - Discord 环境下自动初始化 SDK 和绑定用户
 * - iOS Safari WebAuthn 兼容性处理
 * - 自动恢复之前的登录状态
 *
 * @features
 * - ✅ Discord 环境自动检测
 * - ✅ Passkey 生物识别登录（Face ID / Touch ID）
 * - ✅ 钱包扩展连接（Sui Wallet / Suiet）
 * - ✅ 游客模式进入
 * - ✅ 自动登录恢复
 * - ✅ iOS Safari WebAuthn 特殊处理
 */

// 首先加载 polyfills（必须在所有其他导入之前）
import { _decorator, Label, Node } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UICallbacks, ViewParams } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { UIView } from "../../common/ui/UIView";
import { UIID } from "../../common/config/GameUIConfig";
import { SuiManager } from "../../blockchain/SuiManager"; // 仍然可能需要 SuiManager 来获取地址
import { DiscordManager } from "../../discord/DiscordManager";
import { smc } from "../../common/ecs/SingletonModuleComp";
import { NetworkManager } from "../../network/NetworkManager";
import { GameConfig } from "../model/GameConfig";

const { ccclass, property } = _decorator;

/**
 * 登录面板组件
 *
 * @class LoginPanel
 * @extends UIView
 *
 * @description
 * 处理游戏登录的主要界面。支持多种登录方式，自动检测环境并适配。
 * 同时负责自动登录恢复和 iOS Safari 兼容性处理。
 */
@ccclass("LoginPanel")
export class LoginPanel extends UIView {
    /** 状态提示标签，显示当前登录进度 */
    @property(Label)
    lbStatus: Label = null!;

    /** 钱包扩展登录按钮（普通环境）或 Discord 用户信息显示（Discord 环境） */
    @property(Node)
    btnCreateAccount: Node = null!;

    /** Passkey 登录按钮 */
    @property(Node)
    btnLogin: Node = null!;

    /** 跳过登录按钮，进入游客模式 */
    @property(Node)
    btnSkip: Node = null!;

    /** 防止重复登录的标志 */
    private _isLoggingIn: boolean = false;

    /** 标记 SuiManager 是否已预加载（用于 iOS Safari WebAuthn 兼容性） */
    private _suiManagerReady: boolean = false;

    // ========== UIView 生命周期 ==========

    onAdded(params: any, callbacks: UICallbacks): void {
        console.log('[LoginPanel] onAdded() called with params:', params);
    }

    onOpen(fromUI: number, ...args: any[]): void {
        console.log('[LoginPanel] onOpen() called');
        this._initUI();
    }

    onUpdate(dt: number): void {
        // 不需要每帧更新
    }

    onClose(toUI: number, ...args: any[]): void {
        console.log('[LoginPanel] onClose() called');
    }

    onRemove(): void {
        console.log("[LoginPanel] onRemove() called");
    }

    // ========== 初始化 ==========

    private _username: string = "guest"; // 默认用户名

    private async _initUI() {
        console.log("[LoginPanel] _initUI() called");
        console.log('[LoginPanel] btnCreateAccount:', this.btnCreateAccount);
        console.log('[LoginPanel] btnLogin:', this.btnLogin);
        console.log('[LoginPanel] btnSkip:', this.btnSkip);

        // 🔑 只显示 Passkey 登录按钮，隐藏其他登录方式
        if (this.btnCreateAccount) {
            this.btnCreateAccount.active = false;
        }
        if (this.btnLogin) {
            this.btnLogin.active = true;
        }
        if (this.btnSkip) {
            this.btnSkip.active = false;
        }

        this._updateStatus(
            '欢迎来到游戏！\n\n' +
            '🔐 使用用户名登录\n' +
            '💰 服务端控制金币\n'
        );
        this._isLoggingIn = false;

        // 自动登录功能：尝试以上次的用户名登录
        const lastUsername = oops.storage.getGlobalData('lastUsername');
        if (lastUsername) {
            this._username = lastUsername;
            this._updateStatus(`检测到上次登录：${this._username}，正在自动登录...`);
            this._autoLogin();
        } else {
            // 默认显示游客模式
            this._username = "guest_" + Math.floor(oops.random.getRandomFloat(0,1) * 10000);
            this._updateStatus(`您是新玩家。将以用户名 "${this._username}" 登录`);
        }
    }

    // ========== 自动登录 ==========

    /**
     * 自动登录
     */
    private async _autoLogin() {
        if (this._isLoggingIn) return;
        this._isLoggingIn = true;

        this._updateStatus("正在尝试自动登录服务器...");
        try {
            // 1. Gate Login
            const gateRes = await NetworkManager.instance.gate.login(this._username);
            
            // 2. Initialize Match Client and Start Match
            // 从 Gate Server 返回的 login 结果中获取 matchUrl
            const matchUrl = gateRes.matchUrl; 
            await NetworkManager.instance.match.initClient(matchUrl);
            const matchRes = await NetworkManager.instance.match.startMatch(gateRes.token);

            // 3. Connect to Room Server
            this._updateStatus("正在连接游戏房间...");
            const connected = await NetworkManager.instance.room.connect(matchRes.serverUrl);

            if (!connected) {
                throw new Error("Failed to connect to Room Server.");
            }
            
            // 更新本地金币（由服务端返回）
            smc.coinPusher.CoinModel.totalGold = gateRes.gold;
            oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, gateRes.gold);

            if (gateRes.offlineReward > 0) {
                oops.gui.open(UIID.OfflineReward, { gold: gateRes.offlineReward });
            }

            // 保存用户名
            oops.storage.setGlobalData("lastUsername", this._username);
            oops.storage.setGlobalData('hasPasskeyLogin', true); // 仍然使用这个flag来表示已登录

            setTimeout(() => {
                this._enterGame();
            }, 1000);

        } catch (error) {
            console.error('[LoginPanel] Auto login failed:', error);
            this._updateStatus(`自动登录失败: ${error instanceof Error ? error.message : String(error)}\n\n请点击登录按钮手动重试`);
            this._isLoggingIn = false;
        }
    }

    // ========== 预加载和状态更新 ==========

    /**
     * 更新状态显示
     */
    private _updateStatus(message: string) {
        if (this.lbStatus) {
            this.lbStatus.string = message;
        }
        console.log('[LoginPanel]', message);
    }

    // ========== 按钮回调 ==========

    /**
     * 点击登录按钮 (简化为用户名登录)
     */
    public async onBtnLogin() {
        console.log('[LoginPanel] onBtnLogin called - Server Login');
        if (this._isLoggingIn) return;

        oops.audio.playEffect('click');
        this._isLoggingIn = true;

        this._updateStatus('正在登录 Gate 服务器...');
        try {
            // 1. Gate Login
            const gateRes = await NetworkManager.instance.gate.login(this._username);
            
            // 2. Initialize Match Client and Start Match
            // 从 Gate Server 返回的 login 结果中获取 matchUrl
            const matchUrl = gateRes.matchUrl;
            await NetworkManager.instance.match.initClient(matchUrl);
            const matchRes = await NetworkManager.instance.match.startMatch(gateRes.token);

            // 3. Connect to Room Server
            this._updateStatus("正在连接游戏房间...");
            const connected = await NetworkManager.instance.room.connect(matchRes.serverUrl);

            if (!connected) {
                throw new Error("Failed to connect to Room Server.");
            }
            
            // 更新本地金币（由服务端返回）
            smc.coinPusher.CoinModel.totalGold = gateRes.gold;
            oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, gateRes.gold);

            if (gateRes.offlineReward > 0) {
                oops.gui.open(UIID.OfflineReward, { gold: gateRes.offlineReward });
            }

            // 保存用户名
            oops.storage.setGlobalData("lastUsername", this._username);
            oops.storage.setGlobalData('hasPasskeyLogin', true); // 仍然使用这个flag来表示已登录

            setTimeout(() => {
                this._enterGame();
            }, 1000);

        } catch (error) {
            console.error('[LoginPanel] Login failed:', error);
            this._updateStatus(`登录失败: ${error instanceof Error ? error.message : String(error)}\n\n请点击登录按钮重试`);
            this._isLoggingIn = false;
        }
    }

    /**
     * 点击跳过登录按钮（游客模式）
     */
    public onBtnSkip() {
        console.log('[LoginPanel] onBtnSkip called');
        oops.audio.playEffect('click');
        this._updateStatus('以游客模式进入游戏');

        // Note: 这里可以考虑是否也走 TSRPC Login，用 guest_xxx 登录
        // 为了简化，目前直接进入游戏
        setTimeout(() => {
            this._enterGame();
        }, 500);
    }

    // ========== 进入游戏 ==========

    /**
     * 进入游戏
     */
    private _enterGame() {
        console.log('[LoginPanel] _enterGame called');

        // 检查是否是首次登录
        const isFirstLogin = !oops.storage.getGlobalData('hasPlayedBefore');
        if (isFirstLogin) {
            console.log('[LoginPanel] First time login, setting flag');
            oops.storage.setGlobalData('hasPlayedBefore', true);
        }

        // 关闭登录面板
        oops.gui.remove(UIID.Login);

        // 启动推金币游戏
        if (smc.coinPusher) {
            smc.coinPusher.startGame();

            // 打开游戏面板
            oops.gui.open(UIID.Game);
        } else {
            console.error('[LoginPanel] CoinPusher entity not initialized!');
        }
    }
}
