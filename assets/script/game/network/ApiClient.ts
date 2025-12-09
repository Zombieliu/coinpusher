import { GateService } from "./GateService";
import { NetworkManager } from "./NetworkManager";

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
        this._userId = userId;
    }

    /**
     * 获取当前用户ID
     */
    get userId(): string {
        if (!this._userId) {
            console.warn("[ApiClient] User ID not set, using empty string");
        }
        return this._userId;
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
