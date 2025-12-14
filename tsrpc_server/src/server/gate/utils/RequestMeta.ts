import { ApiCall } from "tsrpc";

export function getClientIp(call: ApiCall<any, any>): string | undefined {
    const headers = call.req.__headers || {};
    return headers['x-forwarded-for']?.split(',')[0]?.trim()
        || headers['x-real-ip']
        || call.conn.ip
        || undefined;
}

export function getUserAgent(call: ApiCall<any, any>): string | undefined {
    const headers = call.req.__headers || {};
    return headers['user-agent'] || undefined;
}
