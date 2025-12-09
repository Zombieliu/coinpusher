/*
 * @Author: dgflash
 * @Date: 2021-07-03 16:13:17
 * @LastEditors: dgflash
 * @LastEditTime: 2025-11-28
 */
// IMPORTANT: Import all ECS components FIRST to ensure @ecs.register decorators run before systems are instantiated
import './game/ecs_registration';

import { _decorator, profiler } from 'cc';
import { DEBUG } from 'cc/env';
import { oops } from '../../extensions/oops-plugin-framework/assets/core/Oops';
import { Root } from '../../extensions/oops-plugin-framework/assets/core/Root';
import { ecs } from '../../extensions/oops-plugin-framework/assets/libs/ecs/ECS';
import { SeedRandom } from '../../extensions/oops-plugin-framework/assets/core/common/random/SeedRandom';
import { ViewUtil } from '../../extensions/oops-plugin-framework/assets/core/utils/ViewUtil';
// import { SentryManager } from './game/common/sentry/SentryManager';
// import { ApiClient } from './game/network/ApiClient';
import { NetworkManager } from './game/network/NetworkManager';
import { smc } from './game/common/SingletonModuleComp';
import { EcsInitializeSystem, Initialize } from './game/initialize/Initialize';
import { UIConfigData } from './game/common/config/GameUIConfig';
import { CoinPusher } from './game/coinpusher/CoinPusher';
import { EcsCoinPusherSystem } from './game/coinpusher/CoinPusher';


const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Root {
    start() {
        // 清除上一个版本的本地存储数据，数据结构有变化，避免报错
        console.log("[Main] run() - Initializing game...");
        oops.storage.clear();
        NetworkManager.instance.init("http://localhost:2000"); // Gate Server URL
        const seed = Date.now().toString();
        console.log(`[Main] Initializing global RNG with seed: ${seed}`);
        new SeedRandom(seed);
       
        if (DEBUG) profiler.showStats();
    }
    
    protected initGui() {
        oops.gui.init(UIConfigData);
    }

    protected initEcsSystem() {
        oops.ecs.add(new EcsInitializeSystem());
        oops.ecs.add(new EcsCoinPusherSystem());  // 推金币游戏系统
    }

    protected run() {
        smc.initialize = ecs.getEntity<Initialize>(Initialize);
        console.log("[Main] Creating CoinPusher entity...");
        smc.coinPusher = ecs.getEntity<CoinPusher>(CoinPusher);

        // 加载游戏场景预制体
        // this.loadGameScene();
    }


    /**
     * 加载游戏场景预制体
     */
    private async loadGameScene() {
        const gameNode = this.game;
        if (!gameNode) {
            console.error("[Main] Game node not found!");
            return;
        }

        console.log("[Main] ========== Loading game scene prefab ==========");
        console.log("[Main] Prefab path: gui/prefab/coinpusher/game");

        try {
            // 使用 OOPS Framework 的 ViewUtil.createPrefabNodeAsync 加载并实例化预制体
            console.log("[Main] Calling ViewUtil.createPrefabNodeAsync...");
            const sceneNode = await ViewUtil.createPrefabNodeAsync("gui/prefab/coinpusher/game");
            console.log("[Main] ViewUtil.createPrefabNodeAsync returned:", !!sceneNode);

            if (!sceneNode) {
                console.error("[Main] ❌ Failed to load and instantiate game scene prefab");
                console.error("[Main] sceneNode is null or undefined");
                return;
            }

            console.log("[Main] ✅ Game scene prefab loaded and instantiated");
            console.log("[Main] Scene node name:", sceneNode.name);

            // 将场景节点添加到 game 节点下
            gameNode.addChild(sceneNode);
            console.log("[Main] Game scene added to game node");

            // 初始化 CoinPusher 场景
            console.log("[Main] ========== Initializing CoinPusher scene ==========");
            console.log("[Main] Scene node:", sceneNode.name);
            console.log("[Main] Scene node children:", sceneNode.children.length);
            smc.coinPusher.initScene(sceneNode);
            console.log("[Main] ✅ CoinPusher scene initialized");

            // 启动游戏
            console.log("[Main] ========== Starting CoinPusher game ==========");
            smc.coinPusher.startGame();
            console.log("[Main] ✅ CoinPusher game started");
        } catch (error) {
            console.error("[Main] Error loading game scene:", error);
        }
    }
}




