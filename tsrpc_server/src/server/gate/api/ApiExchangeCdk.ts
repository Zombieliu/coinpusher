import { ApiCall } from "tsrpc";
import { ReqExchangeCdk, ResExchangeCdk } from "../../../tsrpc/protocols/gate/PtlExchangeCdk";
import { CdkSystem } from "../bll/CdkSystem";

export async function ApiExchangeCdk(call: ApiCall<ReqExchangeCdk, ResExchangeCdk>) {
    // 假设userId通过header或connection state传递，这里简化处理
    const userId = (call.conn as any).userId; 
    
    // 如果没有userId，可能是HTTP调用，需要鉴权
    // 这里为了演示，假设在 gate server 中通过 token 验证后的 userId 存在于 connection 或 call 中
    // 实际项目中可能需要类似于: const userId = await Auth.getUserId(call);
    
    // 简单起见，如果没有userId，返回错误
    if (!userId) {
        call.error('Unauthorized', { code: 'UNAUTHORIZED' });
        return;
    }

    try {
        const result = await CdkSystem.exchangeCdk(userId, call.req.code);
        if (!result.success) {
            call.error(result.error || '兑换失败');
            return;
        }

        call.succ({
            success: true,
            rewards: result.rewards
        });
    } catch (e: any) {
        call.error(e.message);
    }
}
