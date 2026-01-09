import { GateService } from "./GateService";
import { NetworkManager } from "./NetworkManager";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

/**
 * @file ApiClient.ts
 * @description 游戏API客户端，提供游戏相关的API调用
 */
export class ApiClient {
    private static _instance: ApiClient;
    private _userId: string = "";

    private constructor() {}

    static get instance(): ApiClient {
        if (!this._instance) {
            this._instance = new ApiClient();
        }
        return this._instance;
    }

    private get gateService(): GateService {
        return NetworkManager.instance.gate;
    }

    /**
     * 设置用户ID（在登录成功后调用）
     */
    setUserId(userId: string) {
        if (!userId) {
            console.warn("[ApiClient] setUserId called with empty value, ignored");
            return;
        }
        this._userId = userId;
        // 兜底持久化，确保刷新后仍可读取
        try {
            oops.storage.set("USER_ID", userId);
            if (typeof localStorage !== "undefined") {
                localStorage.setItem("USER_ID", userId);
                localStorage.setItem("persist_userId", userId);
            }
        } catch {
            // 非浏览器环境可能没有 localStorage，静默忽略
        }
    }

    /**
     * 获取当前用户ID
     */
    get userId(): string {
        if (this._userId) {
            return this._userId;
        }

        // 尝试从本地存储恢复
        const stored = this._loadStoredUserId();
        if (stored) {
            this._userId = stored;
            return stored;
        }

        throw new Error("[ApiClient] 用户未登录，无法调用金币接口。请先完成登录。");
    }

    /**
     * 从 oops.storage 或 localStorage 中读取用户 ID
     */
    private _loadStoredUserId(): string | null {
        const fromOops = oops.storage.get("USER_ID");
        if (fromOops) return fromOops.toString();

        if (typeof localStorage !== "undefined") {
            const id = localStorage.getItem("USER_ID") || localStorage.getItem("persist_userId");
            if (id) return id;
        }
        return null;
    }

    /**
     * 收集金币
     * @param coinValue 金币数量
     * @returns 当前金币总数
     */
    async collectCoin(coinValue: number): Promise<number> {
        const client = this.gateService.client;
        if (!client) {
            throw new Error("Gate service client not initialized");
        }

        const res = await client.callApi("CollectCoin", {
            userId: this.userId,
            amount: coinValue
        });

        if (!res.isSucc) {
            throw new Error(res.err.message);
        }

        return res.res.currentGold;
    }

    /**
     * 消耗金币
     * @param amount 消耗数量
     * @returns 当前金币总数
     */
    async consumeGold(amount: number): Promise<number> {
        const client = this.gateService.client;
        if (!client) {
            throw new Error("Gate service client not initialized");
        }

        const res = await client.callApi("ConsumeGold", {
            userId: this.userId,
            amount: amount
        });

        if (!res.isSucc) {
            throw new Error(res.err.message);
        }

        return res.res.currentGold;
    }
}
