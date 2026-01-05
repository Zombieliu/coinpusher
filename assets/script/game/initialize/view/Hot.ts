import { error, log, native, sys } from "cc";
import { oops } from "../../../../../extensions/oops-plugin-framework/assets/core/Oops";

/** 热更参数 */
export class HotOptions {
    /** 获取到版本号信息 */
    onVersionInfo: Function | null = null;
    /** 发现新版本，请更新 */
    onNeedToUpdate: Function | null = null;
    /** 和远程版本一致，无须更新 */
    onNoNeedToUpdate: Function | null = null;
    /** 更新失败 */
    onUpdateFailed: Function | null = null;
    /** 更新完成 */
    onUpdateSucceed: Function | null = null;
    /** 更新进度 */
    onUpdateProgress: Function | null = null;

    check() {
        for (let key in this) {
            if (key !== "check") {
                if (!this[key]) {
                    log(`HotOptions.${key} is not set!`);
                    return false;
                }
            }
        }
        return true
    }
}

/** 热更管理 */
export class Hot {
    private assetsMgr: native.AssetsManager = null!;
    private options: HotOptions | null = null;
    private state = Hot.State.None;
    private storagePath: string = "";
    private manifest: string = "";

    static State = {
        None: 0,
        Check: 1,
        Update: 2,
    }

    /** 热更初始化 */
    init(opt: HotOptions) {
        if (!sys.isNative) {
            return;
        }
        if (!opt.check()) {
            return;
        }
        this.options = opt;

        if (this.assetsMgr) {
            return;
        }

        oops.res.load("project", (err: Error | null, res: any) => {
            if (err) {
                error("[HotUpdate] Missing hot-update config file");
                return;
            }

            this.showSearchPath();

            this.manifest = res.nativeUrl;
            this.storagePath = `${native.fileUtils.getWritablePath()}oops_framework_remote`;
            this.assetsMgr = new native.AssetsManager(this.manifest, this.storagePath, (versionA, versionB) => {
                console.log("[HotUpdate] Client version: " + versionA + ", latest version: " + versionB);
                this.options?.onVersionInfo && this.options.onVersionInfo({ local: versionA, server: versionB });

                let vA = versionA.split('.');
                let vB = versionB.split('.');
                for (let i = 0; i < vA.length; ++i) {
                    let a = parseInt(vA[i]);
                    let b = parseInt(vB[i] || '0');
                    if (a !== b) {
                        return a - b;
                    }
                }

                if (vB.length > vA.length) {
                    return -1;
                }
                else {
                    return 0;
                }
            });

            // 设置验证回调，如果验证通过，则返回true，否则返回false
            this.assetsMgr.setVerifyCallback((path: string, asset: jsb.ManifestAsset) => {
                // 压缩资源时，我们不需要检查其md5，因为zip文件已被删除
                var compressed = asset.compressed;
                // 检索正确的md5值
                var expectedMD5 = asset.md5;
                // 资源路径是相对路径，路径是绝对路径
                var relativePath = asset.path;
                // 资源文件的大小，但此值可能不存在
                var size = asset.size;

                return true;
            });

            var localManifest = this.assetsMgr.getLocalManifest();
            console.log('[HotUpdate] Storage path: ' + this.storagePath);
            console.log('[HotUpdate] Local manifest path: ' + this.manifest);
            console.log('[HotUpdate] Local package url: ' + localManifest.getPackageUrl());
            console.log('[HotUpdate] Remote project.manifest url: ' + localManifest.getManifestFileUrl());
            console.log('[HotUpdate] Remote version.manifest url: ' + localManifest.getVersionFileUrl());

            this.checkUpdate();
        });
    }

    /** 删除热更所有存储文件 */
    clearHotUpdateStorage() {
        native.fileUtils.removeDirectory(this.storagePath);
    }

    // 检查更新
    checkUpdate() {
        if (!this.assetsMgr) {
            console.log('[HotUpdate] Please initialize first')
            return;
        }

        if (this.assetsMgr.getState() === jsb.AssetsManager.State.UNINITED) {
            error('[HotUpdate] Not initialized')
            return;
        }
        if (!this.assetsMgr.getLocalManifest().isLoaded()) {
            console.log('[HotUpdate] Failed to load local manifest...');
            return;
        }
        this.assetsMgr.setEventCallback(this.onHotUpdateCallBack.bind(this));
        this.state = Hot.State.Check;
        // 下载version.manifest，进行版本比对
        this.assetsMgr.checkUpdate();
    }

    /** 开始更热 */
    hotUpdate() {
        if (!this.assetsMgr) {
            console.log("[HotUpdate] Please initialize first")
            return
        }
        this.assetsMgr.setEventCallback(this.onHotUpdateCallBack.bind(this));
        this.state = Hot.State.Update;
        this.assetsMgr.update();
    }

    private onHotUpdateCallBack(event: native.EventAssetsManager) {
        let code = event.getEventCode();
        switch (code) {
            case native.EventAssetsManager.ALREADY_UP_TO_DATE:
                console.log("[HotUpdate] Already up to date");
                this.options?.onNoNeedToUpdate && this.options.onNoNeedToUpdate(code)
                break;
            case native.EventAssetsManager.NEW_VERSION_FOUND:
                console.log("[HotUpdate] New version found, please update");
                this.options?.onNeedToUpdate && this.options.onNeedToUpdate(code, this.assetsMgr!.getTotalBytes());
                break;
            case native.EventAssetsManager.ASSET_UPDATED:
                console.log('[HotUpdate] Asset updated');
                break;
            case native.EventAssetsManager.UPDATE_PROGRESSION:
                if (this.state === Hot.State.Update) {
                    // event.getPercent();
                    // event.getPercentByFile();
                    // event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
                    // event.getDownloadedBytes() + ' / ' + event.getTotalBytes();
                    console.log('[HotUpdate] Updating...', event.getDownloadedFiles(), event.getTotalFiles(), event.getPercent());
                    this.options?.onUpdateProgress && this.options.onUpdateProgress(event);
                }
                break;
            case native.EventAssetsManager.UPDATE_FINISHED:
                this.onUpdateFinished();
                break;
            default:
                this.onUpdateFailed(code);
                break;
        }
    }

    private onUpdateFailed(code: any) {
        this.assetsMgr.setEventCallback(null!)
        this.options?.onUpdateFailed && this.options.onUpdateFailed(code);
    }

    private onUpdateFinished() {
        this.assetsMgr.setEventCallback(null!);
        let searchPaths = native.fileUtils.getSearchPaths();
        let newPaths = this.assetsMgr.getLocalManifest().getSearchPaths();
        Array.prototype.unshift.apply(searchPaths, newPaths);
        localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
        native.fileUtils.setSearchPaths(searchPaths);

        console.log("[HotUpdate] Update succeeded");
        this.options?.onUpdateSucceed && this.options.onUpdateSucceed();
    }

    private showSearchPath() {
        console.log("========================Search Paths========================");
        let searchPaths = native.fileUtils.getSearchPaths();
        for (let i = 0; i < searchPaths.length; i++) {
            console.log("[" + i + "]: " + searchPaths[i]);
        }
        console.log("======================================================");
    }
}
