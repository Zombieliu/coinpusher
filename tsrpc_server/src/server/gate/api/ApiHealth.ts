import { ApiCall } from "tsrpc";
import { ReqHealth, ResHealth } from "../../../tsrpc/protocols/gate/PtlHealth";
import { HealthCheck } from "../../utils/HealthCheck";

export async function ApiHealth(call: ApiCall<ReqHealth, ResHealth>) {
    const health = await HealthCheck.fullHealth();
    call.setHttpResHeader('Content-Type', 'application/json');
    call.succ({
        status: health.status,
        message: health.status === 'healthy' ? 'ok' : 'degraded',
        timestamp: health.timestamp,
        uptime: health.uptime,
        checks: health.checks
    });
}
