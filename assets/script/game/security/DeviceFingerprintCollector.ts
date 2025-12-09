/**
 * 🔍 设备指纹收集器（客户端）
 *
 * 收集多维度设备特征用于识别设备唯一性
 * 防止多账号滥用和作弊行为
 */

import { _decorator, sys } from 'cc';
const { ccclass } = _decorator;

export interface DeviceFingerprintData {
    // ===== 基础信息 =====
    userAgent: string;
    platform: string;           // Win32, MacIntel, Linux x86_64, etc.
    language: string;           // zh-CN, en-US, etc.
    languages: string[];        // 浏览器支持的语言列表
    timezone: number;           // 时区偏移（分钟）
    timezoneString: string;     // Asia/Shanghai, etc.

    // ===== 屏幕信息 =====
    screenResolution: string;   // 1920x1080
    screenColorDepth: number;   // 24, 32
    screenPixelRatio: number;   // 设备像素比
    availableScreenSize: string; // 可用屏幕尺寸

    // ===== 硬件信息 =====
    hardwareConcurrency: number; // CPU核心数
    deviceMemory?: number;       // RAM大小（GB）
    maxTouchPoints: number;      // 最大触摸点数

    // ===== 高级指纹 =====
    canvasFingerprint: string;   // Canvas指纹
    webGLFingerprint: string;    // WebGL指纹
    audioFingerprint: string;    // Audio指纹
    fontFingerprint: string;     // 字体指纹

    // ===== 浏览器特征 =====
    doNotTrack?: string;
    cookieEnabled: boolean;
    plugins: string[];           // 插件列表

    // ===== Cocos特有信息 =====
    cocosVersion: string;
    renderMode: string;          // WebGL, Canvas

    // ===== 时间戳 =====
    timestamp: number;
}

@ccclass('DeviceFingerprintCollector')
export class DeviceFingerprintCollector {
    /**
     * 收集完整设备指纹
     */
    static async collect(): Promise<DeviceFingerprintData> {
        console.log('[DeviceFingerprint] Starting collection...');

        const fingerprint: DeviceFingerprintData = {
            // 基础信息
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: Array.from(navigator.languages || [navigator.language]),
            timezone: new Date().getTimezoneOffset(),
            timezoneString: Intl.DateTimeFormat().resolvedOptions().timeZone,

            // 屏幕信息
            screenResolution: `${screen.width}x${screen.height}`,
            screenColorDepth: screen.colorDepth,
            screenPixelRatio: window.devicePixelRatio || 1,
            availableScreenSize: `${screen.availWidth}x${screen.availHeight}`,

            // 硬件信息
            hardwareConcurrency: navigator.hardwareConcurrency || 0,
            deviceMemory: (navigator as any).deviceMemory,
            maxTouchPoints: navigator.maxTouchPoints || 0,

            // 高级指纹（异步收集）
            canvasFingerprint: '',
            webGLFingerprint: '',
            audioFingerprint: '',
            fontFingerprint: '',

            // 浏览器特征
            doNotTrack: (navigator as any).doNotTrack || (window as any).doNotTrack,
            cookieEnabled: navigator.cookieEnabled,
            plugins: this.getPlugins(),

            // Cocos信息
            cocosVersion: '', // TODO: 从cc获取
            renderMode: this.getRenderMode(),

            timestamp: Date.now()
        };

        // 异步收集高级指纹
        try {
            fingerprint.canvasFingerprint = this.getCanvasFingerprint();
        } catch (err) {
            console.warn('[DeviceFingerprint] Canvas fingerprint failed:', err);
        }

        try {
            fingerprint.webGLFingerprint = this.getWebGLFingerprint();
        } catch (err) {
            console.warn('[DeviceFingerprint] WebGL fingerprint failed:', err);
        }

        try {
            fingerprint.audioFingerprint = await this.getAudioFingerprint();
        } catch (err) {
            console.warn('[DeviceFingerprint] Audio fingerprint failed:', err);
        }

        try {
            fingerprint.fontFingerprint = this.getFontFingerprint();
        } catch (err) {
            console.warn('[DeviceFingerprint] Font fingerprint failed:', err);
        }

        console.log('[DeviceFingerprint] Collection complete:', fingerprint);
        return fingerprint;
    }

    /**
     * Canvas指纹 - 最稳定的指纹技术
     */
    private static getCanvasFingerprint(): string {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;

        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // 绘制复杂图形
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('🎮 Cocos Game 🔒', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Device ID', 4, 17);

        // 生成hash（使用DataURL）
        const dataURL = canvas.toDataURL();
        return this.simpleHash(dataURL);
    }

    /**
     * WebGL指纹 - 显卡信息
     */
    private static getWebGLFingerprint(): string {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) return 'no-webgl';

        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return 'no-debug-info';

        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

        // 收集更多WebGL参数
        const params = [
            `vendor:${vendor}`,
            `renderer:${renderer}`,
            `version:${gl.getParameter(gl.VERSION)}`,
            `shadingLanguageVersion:${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}`,
            `maxTextureSize:${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`,
            `maxViewportDims:${gl.getParameter(gl.MAX_VIEWPORT_DIMS)}`,
        ];

        return this.simpleHash(params.join('|'));
    }

    /**
     * Audio指纹 - 音频处理特征
     */
    private static async getAudioFingerprint(): Promise<string> {
        return new Promise((resolve) => {
            try {
                const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (!AudioContext) {
                    resolve('no-audio-context');
                    return;
                }

                const context = new AudioContext();
                const oscillator = context.createOscillator();
                const analyser = context.createAnalyser();
                const gainNode = context.createGain();
                const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

                gainNode.gain.value = 0; // 静音
                oscillator.type = 'triangle';
                oscillator.connect(analyser);
                analyser.connect(scriptProcessor);
                scriptProcessor.connect(gainNode);
                gainNode.connect(context.destination);

                scriptProcessor.onaudioprocess = (event) => {
                    const output = event.outputBuffer.getChannelData(0);
                    const fingerprint = Array.from(output.slice(0, 30))
                        .map(v => v.toFixed(10))
                        .join(',');

                    oscillator.stop();
                    scriptProcessor.disconnect();
                    context.close();

                    resolve(this.simpleHash(fingerprint));
                };

                oscillator.start(0);

                // 超时保护
                setTimeout(() => {
                    oscillator.stop();
                    context.close();
                    resolve('audio-timeout');
                }, 1000);
            } catch (err) {
                resolve('audio-error');
            }
        });
    }

    /**
     * 字体指纹 - 检测已安装字体
     */
    private static getFontFingerprint(): string {
        const baseFonts = ['monospace', 'sans-serif', 'serif'];
        const testFonts = [
            'Arial', 'Verdana', 'Times New Roman', 'Courier New',
            'Georgia', 'Palatino', 'Garamond', 'Bookman',
            'Comic Sans MS', 'Trebuchet MS', 'Impact',
            // 中文字体
            'Microsoft YaHei', 'SimSun', 'SimHei',
            // Mac字体
            'Helvetica Neue', 'Lucida Grande',
            // Linux字体
            'Ubuntu', 'Droid Sans'
        ];

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const text = "mmmmmmmmmmlli";

        const detectedFonts: string[] = [];

        // 获取基准尺寸
        const baseSizes: { [key: string]: { width: number; height: number } } = {};
        for (const baseFont of baseFonts) {
            ctx.font = `72px ${baseFont}`;
            const metrics = ctx.measureText(text);
            baseSizes[baseFont] = {
                width: metrics.width,
                height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
            };
        }

        // 检测每个字体
        for (const font of testFonts) {
            let detected = false;

            for (const baseFont of baseFonts) {
                ctx.font = `72px "${font}", ${baseFont}`;
                const metrics = ctx.measureText(text);
                const width = metrics.width;
                const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

                if (
                    width !== baseSizes[baseFont].width ||
                    height !== baseSizes[baseFont].height
                ) {
                    detected = true;
                    break;
                }
            }

            if (detected) {
                detectedFonts.push(font);
            }
        }

        return this.simpleHash(detectedFonts.join(","));
    }

    /**
     * 获取插件列表
     */
    private static getPlugins(): string[] {
        const plugins: string[] = [];

        if (navigator.plugins) {
            for (let i = 0; i < navigator.plugins.length; i++) {
                const plugin = navigator.plugins[i];
                plugins.push(plugin.name);
            }
        }

        return plugins;
    }

    /**
     * 获取渲染模式
     */
    private static getRenderMode(): string {
        // 从Cocos获取渲染模式
        if (sys.platform === sys.Platform.WECHAT_GAME) {
            return 'wechat-webgl';
        } else if (sys.platform === sys.Platform.MOBILE_BROWSER) {
            return 'mobile-webgl';
        } else if (sys.platform === sys.Platform.DESKTOP_BROWSER) {
            return 'desktop-webgl';
        }
        return 'unknown';
    }

    /**
     * 简单哈希函数（DJB2）
     */
    private static simpleHash(str: string): string {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
        }
        return (hash >>> 0).toString(16);
    }

    /**
     * 生成设备ID（综合多个指纹）
     */
    static generateDeviceId(fingerprint: DeviceFingerprintData): string {
        const components = [
            fingerprint.canvasFingerprint,
            fingerprint.webGLFingerprint,
            fingerprint.audioFingerprint,
            fingerprint.screenResolution,
            fingerprint.platform,
            fingerprint.hardwareConcurrency.toString(),
        ];

        const combined = components.join('|');
        return this.simpleHash(combined);
    }
}
