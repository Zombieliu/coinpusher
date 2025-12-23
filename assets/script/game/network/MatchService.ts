import { serviceProto as ServiceProtoMatch, ServiceType as ServiceTypeMatch } from "../../tsrpc/protocols/ServiceProtoMatch";
import { CC_EDITOR } from "cc/env";
import type { HttpClient } from "tsrpc-browser";
import { ShareConfig } from "../../tsrpc/models/ShareConfig";
import { Security } from "../../tsrpc/models/Security";
import { BaseResponse } from "../../tsrpc/protocols/base";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";

export class MatchService {
    client: HttpClient<ServiceTypeMatch> | null = null;

    async initClient(serverUrl: string) {
        if (this.client) {
            // 如果已经初始化且地址相同，直接复用
            if (this.client.options.server === serverUrl) {
                return;
            }

            // 地址变化时，先断开旧客户端
            await this.client.disconnect?.();
            this.client = null;
        }

        const { HttpClient } = await import("tsrpc-browser");
        this.client = new HttpClient(ServiceProtoMatch, {
            server: serverUrl,
            logger: console,
            json: ShareConfig.json
        });
        this._applySecurity(this.client);
        this._applyAuth(this.client);
    }

    async startMatch(token: string): Promise<{ serverUrl: string, roomId: string }> {
        if (!this.client) throw new Error("Match client not initialized");

        // 设置 Token
        this.client.flows.preCallApiFlow.push(v => {
            v.req.__ssoToken = token;
            return v;
        });

        const res = await this.client.callApi("MatchStart", {});
        if (!res.isSucc) {
            throw new Error(res.err.message);
        }

        return {
            serverUrl: res.res.serverUrl,
            roomId: res.res.roomId
        };
    }

    private _applySecurity(client: HttpClient<ServiceTypeMatch>) {
        if (!ShareConfig.security) return;

        client.flows.preSendDataFlow.push(v => {
            if (v.data instanceof Uint8Array) {
                v.data = Security.encrypt(v.data);
            }
            return v;
        });

        client.flows.preRecvDataFlow.push(v => {
            if (v.data instanceof Uint8Array) {
                v.data = Security.decrypt(v.data);
            }
            return v;
        });
    }

    private _applyAuth(client: HttpClient<ServiceTypeMatch>) {
        client.flows.preCallApiFlow.push(v => {
            const token = oops.storage.get("SSO_TOKEN");
            if (token) {
                (v.req as any).__ssoToken = token;
            }
            return v;
        });

        client.flows.postApiReturnFlow.push(v => {
            if (v.return.isSucc) {
                const res = v.return.res as BaseResponse;
                if (res.__ssoToken !== undefined) {
                    oops.storage.set('SSO_TOKEN', res.__ssoToken);
                }
            } else if (v.return.err.code === 'NEED_LOGIN') {
                oops.storage.remove('SSO_TOKEN');
            }
            return v;
        });
    }
}
