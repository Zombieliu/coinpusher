/**
 * 网络环境统一配置
 *
 * 可以通过两种方式切换环境：
 * 1. 构建前设置 globalThis.__NETWORK_ENV__ = 'test' | 'prod'
 * 2. 运行时调用 NetworkConfig.setEnvironment('test')
 *
 * 也可以在运行时调用 NetworkConfig.overrideEndpoints({...})
 * 来直接指定自定义地址（例如热修复、调试）。
 */

export type NetworkEnvironment = "local" | "test" | "prod";

export interface NetworkEndpoints {
    /** Gate/Gateway 服务地址（HTTP/HTTPS） */
    gateUrl: string;
    /** 匹配服务器地址（可选，如果 Gate 返回的是内网地址，可用此值覆盖） */
    matchUrl?: string;
}

const PRESET_ENDPOINTS: Record<NetworkEnvironment, NetworkEndpoints> = {
    local: {
        gateUrl: "https://gate-production-41a5.up.railway.app",
        matchUrl: "https://match-production-41a5.up.railway.app"
    },
    test: {
        gateUrl: "https://gate-production-41a5.up.railway.app",
        matchUrl: "https://match-production-41a5.up.railway.app" // TODO: 替换为真实测试服地址
    },
    prod: {
        gateUrl: "https://gate-production-41a5.up.railway.app",
        matchUrl: "https://match-production-3cae.up.railway.app" // TODO: 替换为真实生产地址
    }
};

class NetworkConfigManager {
    private _env: NetworkEnvironment;
    private _overrides: Partial<NetworkEndpoints> = {};

    constructor() {
        const runtimeEnv = (globalThis as any).__NETWORK_ENV__ as NetworkEnvironment | undefined;
        this._env = runtimeEnv && PRESET_ENDPOINTS[runtimeEnv] ? runtimeEnv : "local";
    }

    /** 当前环境 */
    get environment(): NetworkEnvironment {
        return this._env;
    }

    /** 切换到指定环境 */
    setEnvironment(env: NetworkEnvironment) {
        if (PRESET_ENDPOINTS[env]) {
            this._env = env;
        } else {
            console.warn(`[NetworkConfig] Unknown environment "${env}", keeping ${this._env}`);
        }
    }

    /** 设置运行期覆盖地址 */
    overrideEndpoints(overrides: Partial<NetworkEndpoints>) {
        this._overrides = {
            ...this._overrides,
            ...overrides
        };
    }

    /** 返回最终生效的地址 */
    get endpoints(): NetworkEndpoints {
        return {
            ...PRESET_ENDPOINTS[this._env],
            ...this._overrides
        };
    }
}

export const NetworkConfig = new NetworkConfigManager();
