/*
 * @Date: 2021-08-12 09:33:37
 * @LastEditors: dgflash
 * @LastEditTime: 2022-11-11 17:41:53
 */

import { LayerType } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/LayerEnum";
import { UIConfig } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/UIConfig";


/** 界面唯一标识（方便服务器通过编号数据触发界面打开） */
export enum UIID {
    /** 资源加载界面 */
    Loading = 1,
    /** 提示弹出窗口 */
    Alert,
    /** 确认弹出窗口 */
    Confirm,
    /** DEMO */
    Demo,
    /** 角色信息 */
    Demo_Role_Info,

    // ========== 推金币游戏 UI ==========
    /** 登录界面 */
    Login = 100,
    /** 游戏主界面 */
    Game,
    /** 设置面板 */
    Setting,
    /** 离线奖励弹窗 */
    OfflineReward,
    /** 成就面板 */
    Achievement,
    /** 签到面板 */
    Checkin,
    /** 背包面板 */
    Inventory,
    /** 大奖弹窗 */
    Jackpot,
}

/** 打开界面方式的配置数据 */
export var UIConfigData: { [key: number]: UIConfig } = {
    [UIID.Loading]: { layer: LayerType.UI, prefab: "loading/prefab/loading", bundle: "resources" },
    [UIID.Alert]: { layer: LayerType.Dialog, prefab: "common/prefab/alert", mask: true },
    [UIID.Confirm]: { layer: LayerType.Dialog, prefab: "common/prefab/confirm", mask: true },
    [UIID.Demo]: { layer: LayerType.UI, prefab: "gui/prefab/demo" },
    [UIID.Demo_Role_Info]: { layer: LayerType.UI, prefab: "gui/prefab/role_info" },

    // ========== 推金币游戏 UI 配置 ==========
    // 使用现有的 UI Prefab 路径（旧版本路径）
    [UIID.Login]: {
        layer: LayerType.UI,
        prefab: "gui/prefab/coinpusher/game",  // 暂时使用 game 场景作为入口
        bundle: "resources"
    },
    [UIID.Game]: {
        layer: LayerType.UI,
        prefab: "prefab/ui/game/gamePanel"  // 使用旧版 gamePanel
    },
    [UIID.Setting]: {
        layer: LayerType.Dialog,
        prefab: "prefab/ui/setting/settingPanel",  // 使用旧版 settingPanel
        mask: true
    },
    [UIID.OfflineReward]: {
        layer: LayerType.PopUp,
        prefab: "prefab/ui/offlineReward/offlineRewardPanel",  // 使用旧版 offlineRewardPanel
        mask: true
    },
    [UIID.Achievement]: {
        layer: LayerType.PopUp,
        prefab: "prefab/ui/achievement/achievementPanel",
        mask: true
    },
    [UIID.Checkin]: {
        layer: LayerType.PopUp,
        prefab: "prefab/ui/checkin/checkinPanel",
        mask: true
    },
    [UIID.Inventory]: {
        layer: LayerType.PopUp,
        prefab: "prefab/ui/inventory/inventoryPanel",
        mask: true
    },
    [UIID.Jackpot]: {
        layer: LayerType.PopUp,
        prefab: "prefab/ui/jackpot/jackpotPanel",
        mask: true
    },
}