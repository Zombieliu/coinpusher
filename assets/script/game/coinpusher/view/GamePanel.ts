/**
 * @file GamePanel.ts
 * @description 游戏主界面，处理金币投放、倒计时奖励、按钮交互等
 *
 * @module coinpusher/view
 *
 * @dependencies
 * - CoinPusher Entity: 推金币游戏主实体
 * - SuiManager: 链上金币同步
 * - OOPS GUI: UI 系统
 *
 * @author UI Team
 * @created 2025-11-28
 *
 * @description
 * GamePanel 是游戏的主要交互界面
 * 主要功能：
 * - 点击推台投放金币
 * - 倒计时自动奖励金币
 * - 显示金币数量
 * - 打开设置、成就、签到、背包等面板
 * - 离线奖励计算和显示
 *
 * @features
 * - ✅ 射线检测点击位置
 * - ✅ 金币投放限流（防止连续点击）
 * - ✅ 倒计时自动奖励
 * - ✅ 链上金币同步
 * - ✅ 离线奖励计算
 */

import { _decorator, Label, Node, Camera, PhysicsSystem, geometry, Vec3, find, BlockInputEvents, UITransform, Widget, Color, Button, RigidBody, ERigidBodyType, BoxCollider, director, Layers } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UICallbacks, ViewParams } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { UIView } from "../../common/ui/UIView";
import { UIID } from "../../common/config/GameUIConfig";
import { smc } from "../../common/ecs/SingletonModuleComp";
import { SuiManager } from "../../blockchain/SuiManager";
import { GameConfig } from "../model/GameConfig";
import { NetworkManager } from "../../network/NetworkManager";
import { NumFont } from "../../utils/numFont";
import { ecs } from "../../../../../extensions/oops-plugin-framework/assets/libs/ecs/ECS";
import { CoinPusher } from "../CoinPusher";
import { paymentService } from "../../network/PaymentService";

const { ccclass, property } = _decorator;

/**
 * 游戏主面板
 *
 * @class GamePanel
 * @extends UIView
 *
 * @description
 * 处理游戏主要交互逻辑：金币投放、倒计时、按钮点击等
 */
@ccclass("GamePanel")
export class GamePanel extends UIView {
    /** 倒计时显示标签 */
    @property(Label)
    lbCountdownTime: Label = null!;

    /** 金币数量显示标签 */
    @property(Label)
    lbGold: Label = null!;

    /** 金币 3D 数码管 */
    @property(NumFont)
    numFont: NumFont = null!;

    /** 新手引导节点 */
    @property(Node)
    ndGuide: Node = null!;

    private _comCamera: Camera = null!;
    private _countdownTime: number = 0; // 倒计时增加金币
    private _checkCanClick: boolean = true; // 可点击生成金币
    private _checkCanClickTime: number = 0; // 可点击时间间隔计算
    private _isFirstClick: boolean = true; // 是否为第一次点击（隐藏新手引导）
    private _isActive: boolean = false; // 面板是否激活
    private _inited: boolean = false; // 是否已执行初始化，防止重复
    private _initRetry: number = 0; // stage 等待重试计数
    private _clickCooldownTimer: any = null; // 点击冷却计时器
    private _purchaseBtn: Node | null = null;
    /** 是否已收到至少一次金币同步（避免初始 0 误判） */
    private _goldSynced: boolean = false;
    /** 防止重复弹“金币同步中” */
    private _goldSyncToastShown: boolean = false;
    /** 1 秒窗口的投币节流计数 */
    private _dropWindowStart: number = 0;
    private _dropWindowCount: number = 0;

    // ========== UIView 生命周期 ==========

    onAdded(params: any, callbacks: UICallbacks): void {
        console.log('[GamePanel] onAdded() called');
        // 有些情况下 onOpen 不触发，兜底在 onAdded 里初始化一次
        this._initUI();
        this._ensureFallbackCoins();
        oops.message.on('COIN_PREFAB_READY', this._onCoinPrefabReady, this);
        oops.message.on('PHYSICS_READY', this._onCoinPrefabReady, this);
        // 如果物理节点已经就绪（UI 打开时事件已错过），立即再尝试一次
        this._onCoinPrefabReady();
    }

    onOpen(fromUI: number, ...args: any[]): void {
        console.log('[GamePanel] onOpen() called');
        this._initUI();
        this._ensureFallbackCoins();
        oops.message.on('COIN_PREFAB_READY', this._onCoinPrefabReady, this);
        oops.message.on('PHYSICS_READY', this._onCoinPrefabReady, this);
        this._onCoinPrefabReady();
    }

    onUpdate(dt: number): void {
        this._tick(dt);
    }

    // 兼容 Cocos 原生 update 回调，防止 onUpdate 未被 Layer 调用时倒计时停滞
    update(dt: number): void {
        this._tick(dt);
    }

    /** 每帧更新逻辑（倒计时与点击节流） */
    private _tick(dt: number) {
        if (!this._isActive) return;

        this._countdownTime -= dt;
        this._updateTime();

        if (!this._checkCanClick) {
            this._checkCanClickTime += dt;
            if (this._checkCanClickTime >= GameConfig.GAMEPANEL_CAN_CLICK_INTERVAL) {
                this._checkCanClick = true;
            }
        }
    }

    onClose(toUI: number, ...args: any[]): void {
        console.log('[GamePanel] onClose() called');
        this._isActive = false;
        oops.message.off('COIN_PREFAB_READY', this._onCoinPrefabReady, this);
        oops.message.off('PHYSICS_READY', this._onCoinPrefabReady, this);
    }

    onRemove(): void {
        console.log('[GamePanel] onRemove() called');
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        oops.message.off(GameConfig.EVENT_LIST.GOLD_CHANGED, this._onGoldChanged, this);
        oops.message.off('COIN_PREFAB_READY', this._onCoinPrefabReady, this);
        oops.message.off('PHYSICS_READY', this._onCoinPrefabReady, this);
    }

    // ========== 初始化 ==========

    private _initUI() {
        if (this._inited) {
            return;
        }
        this._isActive = true;
        this._goldSynced = false;
        this._goldSyncToastShown = false;

        // 触摸要透传到本面板，关闭预制里自带的 BlockInputEvents（否则事件被拦截）
        const blocker = this.getComponent(BlockInputEvents);
        if (blocker) {
            blocker.enabled = false;
        }
        // 确保根节点及子节点使用 UI_2D 层，避免挡住 3D 射线（仅保留 2D UI 元素在此层）
        this.node.layer = Layers.Enum.UI_2D;
        this.node.children.forEach(c => c.layer = Layers.Enum.UI_2D);

        // 标记已初始化
        this._inited = true;

        // 兜底：如果 prefab 没绑定金币显示或引导节点，运行时自动生成
        this._ensureGoldLabel();
        this._ensureGuideNode();
        this._ensureCoinPusher();
        this._ensureInitialGold();
        this._ensurePurchaseButton();

        // 查找主摄像机
        this._comCamera = find('Main Camera')?.getComponent(Camera)
            || smc.coinPusher?.GameView?.cameraNode?.getComponent(Camera)
            || find('root/game/Main Camera')?.getComponent(Camera)
            || null;
        if (!this._comCamera) {
            console.error('[GamePanel] Main Camera not found!');
        }

        // 注册触摸事件
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        console.log('[GamePanel] TOUCH_START listener registered on gamePanel node');

        // 监听金币变化事件
        oops.message.on(GameConfig.EVENT_LIST.GOLD_CHANGED, this._onGoldChanged, this);

        // 初始化倒计时
        this._countdownTime = GameConfig.COUNTDOWN_REWARD_TIME + 1;
        this._updateTime();

        // 初始化金币显示
        this._updateGoldDisplay();

        // 显示新手引导（如果需要）
        if (this.ndGuide) {
            this.ndGuide.active = this._isFirstClick;
        }
        // 确保 3D 触摸平面已显示（兜底）
        smc.coinPusher?.GameView?.setTouchPlaneVisible(true);

        // 检查离线奖励
        this._checkOfflineReward();
    }

    /** 若进入场景后台面没有金币，创建本地兜底金币（30 枚），避免“空台面”视觉问题 */
    private _ensureFallbackCoins(retry: number = 120, delayMs: number = 250) {
        // 调试期关闭兜底，直接依赖服务器快照
        if (GameConfig.DISABLE_FALLBACK_COINS) {
            return;
        }
        console.log(`[GamePanel] ensureFallbackCoins retry=${retry}`);
        // 若已连接房间（有服务器快照），不要再铺本地兜底金币，防止与服务器状态冲突
        if (NetworkManager.instance?.room?.client) {
            return;
        }
        if (!smc.coinPusher) {
            if (retry > 0) {
                setTimeout(() => this._ensureFallbackCoins(retry - 1, delayMs), delayMs);
            }
            return;
        }

        const physics = smc.coinPusher?.Physics;
        const physicsReady = this._tryBindPhysicsNodes(physics);
        if (!physicsReady) {
            if (retry > 0) {
                setTimeout(() => this._ensureFallbackCoins(retry - 1, delayMs), delayMs);
            } else {
                const flags = {
                    hasPhysics: !!physics,
                    coinParent: !!physics?.coinParent,
                    pushNode: !!physics?.pushNode,
                    coinPrefab: !!physics?.coinPrefab,
                };
                console.warn('[GamePanel] Fallback coins skipped: physics not ready', flags);
            }
            return;
        }

        if (!physics.coinPrefab) {
            // 主动触发加载（兜底，避免事件丢失）
            physics.ensureCoinPrefab?.().catch((err: any) => {
                console.warn('[GamePanel] ensureCoinPrefab failed:', err);
            });
            if (retry > 0) {
                setTimeout(() => this._ensureFallbackCoins(retry - 1, delayMs), delayMs);
            } else {
                console.warn('[GamePanel] Fallback coins skipped: coinPrefab not ready');
            }
            return;
        }

        if (physics.coinParent.children.length > 0) {
            return; // 已有金币
        }

        const parent = physics.coinParent;
        let count = 0;
        // 基于推台 collider 尺寸计算铺币区域（世界坐标）
        const collider = physics.pushNode?.getComponent(BoxCollider);
        const pushScale = physics.pushNode?.worldScale ?? Vec3.ONE;
        const center = collider?.center ?? Vec3.ZERO;
        const size = collider?.size ?? new Vec3(6.6, 0.5, 8);

        const halfX = (size.x * pushScale.x) * 0.5;
        const halfZ = (size.z * pushScale.z) * 0.5;
        const baseY = (physics.pushNode?.worldPosition.y ?? 0) + (center.y + size.y * 0.5) * pushScale.y + 0.05;

        const GOLD_ON_STAND_POS_MAX_X = halfX * 0.9;
        const GOLD_ON_STAND_POS_MIN_Z = -halfZ * 0.9;
        const GOLD_ON_STAND_POS_MAX_Z = halfZ * 0.9;
        const stepZ = Math.max(0.3, halfZ * 0.25);
        const stepX = Math.max(0.6, halfX * 0.2);

        // 推板前缘（世界坐标），兜底铺币时禁止生成在推板上或其后方
        const pushFrontZ = (physics.pushNode?.worldPosition.z ?? 0) + halfZ;
        const safeFrontMargin = 0.2;

        for (let z = GOLD_ON_STAND_POS_MIN_Z; z < GOLD_ON_STAND_POS_MAX_Z && count < 30; z += stepZ) {
            for (let x = -GOLD_ON_STAND_POS_MAX_X; x <= GOLD_ON_STAND_POS_MAX_X && count < 30; x += stepX) {
                // 使用世界坐标落点，再转为 coinParent 的本地坐标
                const worldPos = new Vec3(x, baseY, z).add(physics.pushNode?.worldPosition ?? Vec3.ZERO);
                // 跳过推板覆盖区域，避免金币出现在推板表面
                if (worldPos.z <= pushFrontZ + safeFrontMargin) {
                    continue;
                }
                const node = physics.createCoin(worldPos);
                if (node) {
                    // 仅作视觉铺币，避免重力立即掉落：设置为静态刚体或关闭重力
                    const rb = node.getComponent(RigidBody);
                    if (rb) {
                        rb.type = ERigidBodyType.STATIC;
                        // @ts-ignore useGravity may存在
                        if ('useGravity' in rb) (rb as any).useGravity = false;
                    }
                    // 确保渲染层一致
                    node.layer = physics.coinParent.layer;
                    count++;
                    if (count === 1) {
                        const wp = node.worldPosition;
                        console.log(`[GamePanel] Fallback coin sample pos world=(${wp.x.toFixed(2)}, ${wp.y.toFixed(2)}, ${wp.z.toFixed(2)})`);
                    }
                }
            }
        }
        console.log(`[GamePanel] Fallback coins created: ${count}`);
    }

    private _onCoinPrefabReady() {
        // prefab / 物理已加载，立即尝试铺一次兜底金币（放入微任务，避免递归事件）
        Promise.resolve().then(() => this._ensureFallbackCoins());
    }

    // ========== 金币变化监听 ==========

    /**
     * 监听金币变化事件
     */
    private _onGoldChanged(newGold: number) {
        console.log('[GamePanel] Gold changed to:', newGold);
        this._updateGoldDisplay();
    }

    /**
     * 更新金币显示
     */
    private _updateGoldDisplay() {
        // 允许在 CoinPusher 尚未完全初始化时也更新显示，避免 _goldSynced 一直为 false
        const coinModel = smc.coinPusher?.CoinModel;
        // 避免被初始 0 覆盖掉服务器/存储里的非零金币
        const candidate = (typeof coinModel?.totalGold === 'number' && coinModel.totalGold > 0)
            ? coinModel.totalGold
            : this._getPlayerGold();
        const displayValue = Math.max(0, Math.floor(candidate));

        if (this.numFont) {
            console.log('[GamePanel] Updating NumFont display:', displayValue);
            this.numFont.updateShow(displayValue);
        }

        // 同步回模型（如果存在），避免后续事件链缺失
        if (coinModel && typeof coinModel.totalGold === 'number') {
            coinModel.totalGold = displayValue;
        }

        // 标记金币已同步，允许投币
        this._goldSynced = true;

        if (this.lbGold) {
            // 避免界面上出现额外的“0”，直接隐藏文本标签，统一用数码管显示
            this.lbGold.node.active = false;
        }
    }

    private _setLayerRecursive(node: Node, layer: number) {
        node.layer = layer;
        node.children.forEach(c => this._setLayerRecursive(c, layer));
    }

    /** 仅在游戏子树内广度搜索指定名字的节点，避免全局深搜绑错节点 */
    private _findInGameSubtree(name: string): Node | null {
        const roots = [
            find('game'),
            find('root/game'),
            find('root/gameRoot'),
        ].filter(Boolean) as Node[];

        for (const r of roots) {
            const q: Node[] = [r];
            while (q.length) {
                const n = q.shift()!;
                if (n.name === name) return n;
                q.push(...n.children);
            }
        }
        return null;
    }

    /** 反复尝试绑定物理组件所需的关键节点（不再广播事件，避免递归） */
    private _tryBindPhysicsNodes(physics: any): boolean {
        if (!physics) return false;

        // 每次都尝试查找，避免被 reset 清空后找不回
        const foundParent =
            find('game/coinParent') ||
            find('root/game/coinParent') ||
            find('root/gameRoot/coinParent') ||
            this._findInGameSubtree('coinParent');
        const foundPush =
            find('game/pushBox') ||
            find('root/game/pushBox') ||
            find('root/gameRoot/pushBox') ||
            this._findInGameSubtree('pushBox');

        if (foundParent && physics.coinParent !== foundParent) {
            physics.coinParent = foundParent;
            console.warn('[GamePanel] Reattached coinParent from scene tree');
            this._setLayerRecursive(foundParent, Layers.Enum.DEFAULT);
        }
        if (foundPush && physics.pushNode !== foundPush) {
            physics.pushNode = foundPush;
            console.warn('[GamePanel] Reattached pushNode from scene tree');
        }

        return !!(physics.coinParent && physics.pushNode);
    }

    /**
     * 获取当前金币数量
     */
    private _getPlayerGold(): number {
        const modelGold = smc.coinPusher?.CoinModel?.totalGold;
        // 模型里有正值则直接使用，避免被 0 覆盖
        if (typeof modelGold === 'number' && modelGold > 0) {
            return modelGold;
        }
        // 尝试从存储恢复（兼容字符串）
        const stored = oops.storage.getGlobalData?.('lastGold');
        const parsed = typeof stored === 'string' ? parseInt(stored, 10) : stored;
        if (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) {
            return parsed;
        }
        // 最终兜底：返回模型值（可能为 0）或 0
        return typeof modelGold === 'number' ? modelGold : 0;
    }

    /** 如果 prefab 未绑定金币文本，运行时自动创建一个角标 */
    private _ensureGoldLabel() {
        if (this.lbGold) return;

        const node = new Node('lbGold');
        const ui = node.addComponent(UITransform);
        ui.setContentSize(140, 50);
        const label = node.addComponent(Label);
        label.string = '0';
        label.fontSize = 32;
        label.color = Color.WHITE;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        const widget = node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignLeft = true;
        widget.top = 20;
        widget.left = 20;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;

        node.parent = this.node;
        this.lbGold = label;
    }

    /** 如果 prefab 未绑定新手引导节点，运行时生成一个不阻挡点击的提示节点 */
    private _ensureGuideNode() {
        // 已经有节点但没有任何可视组件时，补齐一个简单的文字提示
        if (this.ndGuide && !this.ndGuide.getComponent(Label) && !this.ndGuide.getComponent(UITransform)) {
            const ui = this.ndGuide.addComponent(UITransform);
            ui.setContentSize(200, 80);
            const label = this.ndGuide.addComponent(Label);
            label.string = 'Tap the tray to drop coins';
            label.fontSize = 28;
            label.color = new Color(255, 255, 0);
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            const widget = this.ndGuide.addComponent(Widget);
            widget.isAlignTop = true;
            widget.isAlignHorizontalCenter = true;
            widget.top = 120;
            widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
            return;
        }

        if (this.ndGuide) return;

        const guide = new Node('ndGuide');
        const ui = guide.addComponent(UITransform);
        ui.setContentSize(200, 80);
        const label = guide.addComponent(Label);
        label.string = 'Tap the tray to drop coins';
        label.fontSize = 28;
        label.color = new Color(255, 255, 0);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        const widget = guide.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignHorizontalCenter = true;
        widget.top = 120;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;

        guide.parent = this.node;
        this.ndGuide = guide;
    }

    /** 离线/游客模式兜底：没有金币时给初始金币，避免无法点击 */
    private _ensureInitialGold() {
        const applyInitGold = () => {
            const stored = oops.storage.getGlobalData?.('lastGold');
            const parsed = typeof stored === 'string' ? parseInt(stored, 10) : stored;
            if (typeof parsed === 'number' && !isNaN(parsed) && parsed >= 0 && smc.coinPusher?.CoinModel) {
                smc.coinPusher.CoinModel.totalGold = parsed;
                oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, parsed);
                return;
            }
            // 若没有存储且没有服务器值，则保持 0，等待后续登录/服务器同步
        };

        // 如果还未创建 coinPusher，稍后重试一次
        if (!smc.coinPusher) {
            setTimeout(() => applyInitGold(), 100);
            return;
        }

        applyInitGold();
    }

    /** 兜底：若 coinPusher 未创建则在 UI 侧自动创建一个实体，避免金币为 0 */
    private _ensureCoinPusher() {
        if (smc.coinPusher) return;

        try {
            smc.coinPusher = ecs.getEntity<CoinPusher>(CoinPusher);
            console.log('[GamePanel] CoinPusher entity auto-created');
            const gold = smc.coinPusher.CoinModel?.totalGold ?? 0;
            oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, gold);
            // 如果已经有房间连接，则绑定 RoomService，避免只渲染本地模式
            if (NetworkManager.instance?.room) {
                smc.coinPusher.Physics.roomService = NetworkManager.instance.room;
            }
            // 仅在未连接服务器时才铺本地兜底金币
            if (!NetworkManager.instance?.room?.client) {
                this._ensureFallbackCoins();
            }
        } catch (err) {
            console.warn('[GamePanel] Failed to auto-create CoinPusher:', err);
        }
    }

    /** 确保支付按钮存在（临时入口） */
    private _ensurePurchaseButton() {
        if (this._purchaseBtn && this._purchaseBtn.isValid) {
            return;
        }

        let btn = this.node.getChildByName('btnPurchase');
        const existed = !!btn;
        if (!btn) {
            btn = new Node('btnPurchase');
            // 确保渲染层与父节点一致（UI_2D），否则 UI 摄像机看不到
            btn.layer = this.node.layer;
            const ui = btn.addComponent(UITransform);
            ui.setContentSize(170, 52);
            const label = btn.addComponent(Label);
            label.string = 'Buy Coins';
            label.fontSize = 28;
            label.color = new Color(255, 220, 20, 255);
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.node.layer = btn.layer;
            const widget = btn.addComponent(Widget);
            widget.isAlignTop = false;
            widget.isAlignBottom = true;
            widget.isAlignRight = true;
            widget.bottom = 32;
            widget.right = 32;
            widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
            btn.addComponent(BlockInputEvents);
            const button = btn.addComponent(Button);
            button.transition = Button.Transition.SCALE;
            // 确保在最上层渲染
            btn.setSiblingIndex(this.node.children.length - 1);
            this.node.addChild(btn);
        }

        btn!.off(Node.EventType.TOUCH_END, this.onBtnPurchase, this);
        btn!.on(Node.EventType.TOUCH_END, this.onBtnPurchase, this);
        btn!.active = true;
        // 再兜底一次层级（如果 prefab 动态插入了别的节点）
        btn!.setSiblingIndex(this.node.children.length - 1);

        if (!existed) {
            // 避免事件冒泡到投币区域
            btn!.on(Node.EventType.TOUCH_START, e => e.propagationStopped = true, this);
        }

        this._purchaseBtn = btn!;
    }

    // ========== 触摸事件处理 ==========

    /**
     * 触摸开始事件
     */
    private async _onTouchStart(e: any) {
        console.log('[GamePanel] _onTouchStart begin, canClick:', this._checkCanClick, 'gold:', this._getPlayerGold());
        if (!this._checkCanClick) return;
        if (!this._goldSynced) {
            if (!this._goldSyncToastShown) {
                oops.gui.toast("Syncing coins, please wait");
                this._goldSyncToastShown = true;
            }
            return;
        }
        // 若节点未初始化，直接忽略
        if (!this.node || !this.node.isValid) {
            console.warn('[GamePanel] node not ready, ignore touch');
            return;
        }

        // 若显示新手引导，隐藏
        if (this._isFirstClick) {
            this._isFirstClick = false;
            if (this.ndGuide) {
                this.ndGuide.active = false;
            }
            // 首次点击后销毁 3D 触摸平面，保持与原版一致
            const gv = smc.coinPusher?.GameView;
            if (gv) {
                gv.destroyTouchPlane();
            }
        }

        this._checkCanClick = false;
        this._checkCanClickTime = 0;
        if (this._clickCooldownTimer) {
            clearTimeout(this._clickCooldownTimer);
        }
        this._clickCooldownTimer = setTimeout(() => {
            this._checkCanClick = true;
            this._clickCooldownTimer = null;
        }, GameConfig.GAMEPANEL_CAN_CLICK_INTERVAL * 1000);

        // 简单节流：每秒最多 10 次
        const now = Date.now();
        if (now - this._dropWindowStart > 1000) {
            this._dropWindowStart = now;
            this._dropWindowCount = 0;
        }
        if (this._dropWindowCount >= 10) {
            oops.gui.toast("Too many actions, please slow down");
            return;
        }
        this._dropWindowCount++;

        // 金币不足直接提示，不再发送投币请求
        const currentGold = this._getPlayerGold();
        if (currentGold <= 0) {
            oops.audio.playEffect(GameConfig.AUDIO_PATH.INVALID);
            oops.gui.toast("Not enough coins");
            return;
        }
        
        // 获取触摸点的 X 坐标，映射到推台物理宽度
        const touchPoint = e.getUILocation ? e.getUILocation() : e.touch?._point;
        const touchX = touchPoint?.x ?? 0;
        // 使用可视尺寸而非 design stage，避免比例失真
        const screenWidth = cc.view.getVisibleSize().width || (oops.stage && oops.stage.width) || 720;

        // 动态获取推台宽度与中心，映射更准确
        const pushNode = smc.coinPusher?.Physics?.pushNode;
        const pushCollider = pushNode?.getComponent(BoxCollider);
        const pushScale = pushNode?.worldScale ?? Vec3.ONE;
        const halfWidth = pushCollider ? (pushCollider.size.x * pushScale.x * 0.5) : GameConfig.GOLD_ON_STAND_POS_MAX_X;
        const centerX = pushNode ? pushNode.worldPosition.x : 0;
        const margin = GameConfig.GOLD_SPAWN_MARGIN_X ?? (GameConfig.GOLD_SIZE * 0.5);

        const offsetX = 0; // 去掉偏移，避免落到左右边界外
        let worldX = centerX + ((touchX - screenWidth * 0.5) / (screenWidth * 0.5)) * halfWidth + offsetX;
        const clampMin = centerX - halfWidth + margin;
        const clampMax = centerX + halfWidth - margin;
        if (worldX < clampMin || worldX > clampMax) {
            console.warn(`[GamePanel] Touch X ${worldX.toFixed(2)} out of range, clamping`);
            worldX = Math.max(clampMin, Math.min(worldX, clampMax));
        }
        console.log(`[GamePanel] touchX=${touchX.toFixed?.(1) ?? touchX}, screenW=${screenWidth}, centerX=${centerX.toFixed(2)}, halfW=${halfWidth.toFixed(2)}, worldX=${worldX.toFixed(2)}`);
        
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);

        try {
            // 发送投币请求给服务器
            console.log(`[GamePanel] dropCoin request => worldX=${worldX.toFixed(3)}`);
            const res = await NetworkManager.instance.room.dropCoin(worldX);
            if (res.isSucc) {
                const coinId = res.coinId ?? Date.now();
                // 客户端预测：生成一个虚影金币，等待服务器同步
                if (smc.coinPusher?.Physics) {
                    smc.coinPusher.Physics.createPredictedCoin(coinId, worldX);
                }
                console.log(`[GamePanel] DropCoin request sent for x=${worldX.toFixed(3)}, server returned coinId=${coinId}`);
                // 客户端预测：立即扣除金币 (如果服务端成功)
                const currentGold = smc.coinPusher.CoinModel.totalGold - 1;
                smc.coinPusher.CoinModel.totalGold = currentGold;
                oops.message.dispatchEvent(GameConfig.EVENT_LIST.GOLD_CHANGED, currentGold);
            } else {
                console.warn("[GamePanel] DropCoin failed:", res.err);
            oops.gui.toast(res.err?.message || "Drop failed");
        }
        } catch (error) {
            console.error("[GamePanel] DropCoin exception:", error);
            oops.gui.toast(`Coin drop failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // ========== 倒计时奖励 ==========

    /**
     * 更新倒计时显示
     */
    private _updateTime() {
        if (!this.lbCountdownTime) {
            return;
        }

        if (this._countdownTime < 0) {
            // 倒计时结束，发放奖励
            oops.audio.playEffect(GameConfig.AUDIO_PATH.COUNTDOWN);

            this._countdownTime = GameConfig.COUNTDOWN_REWARD_TIME + 1;

            // 增加金币
            if (smc.coinPusher) {
                smc.coinPusher.collectCoin(GameConfig.COUNTDOWN_REWARD_GOLD);
            }
        }

        // 格式化时间显示 MM:SS
        const timeS = Math.floor(this._countdownTime % 60);
        const timeM = Math.floor(this._countdownTime / 60 % 60);

        if (timeS < 10) {
            this.lbCountdownTime.string = '0' + timeM + ':0' + timeS;
        } else {
            this.lbCountdownTime.string = '0' + timeM + ':' + timeS;
        }
    }

    // ========== 离线奖励 ==========

    /**
     * 检查离线奖励
     */
    private _checkOfflineReward() {
        const hideTime = oops.storage.getGlobalData('hideTime');
        if (!hideTime) {
            return;
        }

        const subTime = Date.now() - hideTime;
        const hour = Math.floor(subTime / 1000 / 60);

        let addGold;
        if (hour >= GameConfig.OFFLINE_MAX_GOLD * (GameConfig.OFFLINE_ADD_GOLD_TIME / 60)) {
            addGold = GameConfig.OFFLINE_MAX_GOLD;
        } else {
            addGold = Math.floor(hour / (GameConfig.OFFLINE_ADD_GOLD_TIME / 60));
        }

        // 临时屏蔽离线奖励弹窗，避免 LayerUI 报错
        // if (addGold > 0) {
        //     oops.gui.open(UIID.OfflineReward, { gold: addGold });
        // }
    }

    // ========== 按钮回调 ==========

    /**
     * 购买入口（Stripe）
     */
    private async onBtnPurchase() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        try {
            await paymentService.startStripe();
        } catch (error: any) {
            console.error("[GamePanel] startStripe failed:", error);
            oops.gui.toast(error?.message || "Create payment failed");
        }
    }

    /**
     * 打开设置面板
     */
    public onBtnSetting() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        oops.gui.toast("Coming soon");
    }

    /**
     * 打开成就面板
     */
    public onBtnAchievement() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        oops.gui.toast("Coming soon");
    }

    /**
     * 打开签到面板
     */
    public onBtnCheckin() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        oops.gui.toast("Coming soon");
    }

    /**
     * 打开背包面板
     */
    public onBtnInventory() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        oops.gui.toast("Coming soon");
    }

    /**
     * 点击广告按钮获取金币
     */
    public async onBtnVideoGetGold() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.COUNTDOWN);

        if (smc.coinPusher) {
            const rewardGold = GameConfig.VIDEO_REWARD_GOLD;
            smc.coinPusher.collectCoin(rewardGold);
            oops.audio.playEffect(GameConfig.AUDIO_PATH.VIDEO_REWARD);
            oops.gui.toast(`Added ${rewardGold} coins!`);
        } else {
            oops.gui.toast('Game is not initialized');
        }
    }
}
