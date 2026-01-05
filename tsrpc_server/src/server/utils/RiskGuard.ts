import { DragonflyDBService } from '../gate/db/DragonflyDBService';

export type RiskContext = {
    userId?: string;
    ip?: string;
    deviceId?: string;
};

export type RiskResult = {
    ok: boolean;
    error?: string;
};

/**
 * 极简风险守卫：
 * - IP/设备黑名单：RISK_IP_DENYLIST、RISK_DEVICE_DENYLIST 逗号分隔
 * - IP 级限速：RISK_MAX_IP_WINDOW（默认60秒）/RISK_MAX_IP_HITS（默认30）
 * - 设备级限速：RISK_MAX_DEVICE_WINDOW（默认60秒）/RISK_MAX_DEVICE_HITS（默认30）
 */
export class RiskGuard {
    static assess(ctx: RiskContext, action: string): RiskResult {
        const ipDeny = (process.env.RISK_IP_DENYLIST || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const devDeny = (process.env.RISK_DEVICE_DENYLIST || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        if (ctx.ip && ipDeny.includes(ctx.ip)) return { ok: false, error: 'risk_blocked_ip' };
        if (ctx.deviceId && devDeny.includes(ctx.deviceId)) return { ok: false, error: 'risk_blocked_device' };

        return { ok: true };
    }

    /** IP/设备级限速，返回 true 表示允许 */
    static async allow(ctx: RiskContext, action: string): Promise<boolean> {
        const ipWindow = Number(process.env.RISK_MAX_IP_WINDOW || '60000');
        const ipHits = Number(process.env.RISK_MAX_IP_HITS || '30');
        const devWindow = Number(process.env.RISK_MAX_DEVICE_WINDOW || '60000');
        const devHits = Number(process.env.RISK_MAX_DEVICE_HITS || '30');

        // 优先用 Dragonfly 分布式限流
        if (DragonflyDBService.ready()) {
            try {
                if (ctx.ip) {
                    const ipRes = await DragonflyDBService.tryAcquireWindow(`risk:ip:${action}`, ctx.ip, ipHits, ipWindow);
                    if (!ipRes.allowed) return false;
                }
                if (ctx.deviceId) {
                    const devRes = await DragonflyDBService.tryAcquireWindow(`risk:dev:${action}`, ctx.deviceId, devHits, devWindow);
                    if (!devRes.allowed) return false;
                }
            } catch {
                // fallthrough to allow
            }
        }
        return true;
    }
}
