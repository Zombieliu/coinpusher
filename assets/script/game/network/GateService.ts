import { serviceProto as ServiceProtoGate, ServiceType as ServiceTypeGate } from "../../tsrpc/protocols/ServiceProtoGate";
import { CC_EDITOR } from "cc/env";
import type { HttpClient } from "tsrpc-browser";
import { ShareConfig } from "../../tsrpc/models/ShareConfig";
import { Security } from "../../tsrpc/models/Security";
import { BaseResponse } from "../../tsrpc/protocols/base";
import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { SecurityUtil } from "../security/SecurityUtil";

export class GateService {
    client: HttpClient<ServiceTypeGate> | null = null;
    private _serverUrl: string;

    constructor(serverUrl: string) {
        this._serverUrl = serverUrl;
        if (!CC_EDITOR) {
            this.initClient();
        }
    }

    private async initClient() {
        const { HttpClient } = await import("tsrpc-browser");
        this.client = new HttpClient(ServiceProtoGate, {
            server: this._serverUrl,
            logger: console,
            json: ShareConfig.json
        });
        this._applySecurity(this.client);
        this._applyAuth(this.client);
    }

    async login(username: string) {
        if (!this.client) await this.initClient();

        const [fingerprintId, nonce, timestamp] = await Promise.all([
            SecurityUtil.getFingerprintId(),
            Promise.resolve(SecurityUtil.generateNonce()),
            Promise.resolve(SecurityUtil.now())
        ]);

        const res = await this.client!.callApi("Login", { username, fingerprintId, nonce, timestamp });
        if (!res.isSucc) {
            throw new Error(res.err.message);
        }

        return res.res;
    }

    private _applySecurity(client: HttpClient<ServiceTypeGate>) {
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

    private _applyAuth(client: HttpClient<ServiceTypeGate>) {
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
