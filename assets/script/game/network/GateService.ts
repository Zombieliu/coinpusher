import { serviceProto as ServiceProtoGate, ServiceType as ServiceTypeGate } from "../../tsrpc/protocols/ServiceProtoGate";
import { CC_EDITOR } from "cc/env";
import type { HttpClient } from "tsrpc-browser";

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
            logger: console
        });
    }

    async login(username: string) {
        if (!this.client) await this.initClient();
        
        const res = await this.client!.callApi("Login", { username });
        if (!res.isSucc) {
            throw new Error(res.err.message);
        }

        return res.res;
    }
}
