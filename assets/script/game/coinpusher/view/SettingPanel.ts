/**
 * @file SettingPanel.ts
 * @description 设置面板
 *
 * @module coinpusher/view
 *
 * @author UI Team
 * @created 2025-11-28
 *
 * @description
 * SettingPanel 提供游戏设置功能：音效、音乐开关等
 */

import { _decorator, Toggle } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { UICallbacks } from "../../../../../extensions/oops-plugin-framework/assets/core/gui/layer/Defines";
import { UIView } from "../../common/ui/UIView";
import { GameConfig } from "../model/GameConfig";

const { ccclass, property } = _decorator;

/**
 * 设置面板
 *
 * @class SettingPanel
 * @extends UIView
 */
@ccclass("SettingPanel")
export class SettingPanel extends UIView {
    /** 音效开关 */
    @property(Toggle)
    toggleSound: Toggle = null!;

    /** 音乐开关 */
    @property(Toggle)
    toggleMusic: Toggle = null!;

    onAdded(params: any, callbacks: UICallbacks): void {
        console.log('[SettingPanel] onAdded()');
    }

    onOpen(fromUI: number, ...args: any[]): void {
        console.log('[SettingPanel] onOpen()');
        this._initUI();
    }

    private _initUI() {
        // 加载设置
        const soundEnabled = oops.storage.getGlobalData('soundEnabled') !== false;
        const musicEnabled = oops.storage.getGlobalData('musicEnabled') !== false;

        if (this.toggleSound) {
            this.toggleSound.isChecked = soundEnabled;
        }

        if (this.toggleMusic) {
            this.toggleMusic.isChecked = musicEnabled;
        }
    }

    /**
     * 音效开关切换
     */
    public onToggleSound(toggle: Toggle) {
        const isEnabled = toggle.isChecked;
        oops.storage.setGlobalData('soundEnabled', isEnabled);

        // 设置音效音量
        oops.audio.effectVolume = isEnabled ? 1.0 : 0.0;

        console.log('[SettingPanel] Sound enabled:', isEnabled);
    }

    /**
     * 音乐开关切换
     */
    public onToggleMusic(toggle: Toggle) {
        const isEnabled = toggle.isChecked;
        oops.storage.setGlobalData('musicEnabled', isEnabled);

        // 设置音乐音量
        oops.audio.musicVolume = isEnabled ? 0.5 : 0.0;

        console.log('[SettingPanel] Music enabled:', isEnabled);
    }

    /**
     * 关闭按钮
     */
    public onBtnClose() {
        oops.audio.playEffect(GameConfig.AUDIO_PATH.CLICK);
        this.close();
    }
}
