import { serviceProto as ServiceProtoMatch, ServiceType as ServiceTypeMatch } from "../../tsrpc/protocols/ServiceProtoMatch";
import { CC_EDITOR } from "cc/env";
import type { HttpClient } from "tsrpc-browser";

export class MatchService {
    client: HttpClient<ServiceTypeMatch> | null = null;

    async initClient(serverUrl: string) {
        if (CC_EDITOR) return;
        const { HttpClient } = await import("tsrpc-browser");
        this.client = new HttpClient(ServiceProtoMatch, {
            server: serverUrl,
            logger: console
        });
    }

    async startMatch(token: string): Promise<{ serverUrl: string, roomId: string }> {
        if (!this.client) throw new Error("Match client not initialized");

        // 设置 Token
        this.client.flows.preCallFlow.push(v => {
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
}
