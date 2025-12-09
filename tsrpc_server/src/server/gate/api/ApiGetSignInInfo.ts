import { ApiCall } from "tsrpc";
import { ReqGetSignInInfo, ResGetSignInInfo } from "../../../tsrpc/protocols/gate/PtlGetSignInInfo";
import { SignInSystem } from "../bll/SignInSystem";
import { apiWrapper, validateRequired } from "../../utils/ErrorHandler";
import { Logger } from "../../utils/Logger";
import { getOrSet } from "../../utils/CacheManager";

/**
 * 获取签到信息API
 *
 * 优化：
 * - 使用 ErrorHandler 统一错误处理
 * - 使用 Logger 记录日志
 * - 使用 CacheManager 缓存签到信息（30秒）
 */
export const ApiGetSignInInfo = apiWrapper<ReqGetSignInInfo, ResGetSignInInfo>(
    async (call: ApiCall<ReqGetSignInInfo, ResGetSignInInfo>) => {
        // 参数验证
        validateRequired(call.req.userId, 'userId');

        const { userId } = call.req;

        // 使用缓存（30秒过期，签到信息更新不频繁但需要相对实时）
        const result = await getOrSet(
            `signin:info:${userId}`,
            async () => {
                Logger.debug('Fetching sign-in info from database', { userId });
                return await SignInSystem.getSignInInfo(userId);
            },
            {
                ttl: 30, // 30秒
                prefix: 'api',
            }
        );

        // 记录日志
        Logger.info('Sign-in info retrieved', {
            userId,
            consecutiveDays: result.record?.consecutiveDays || 0,
            totalDays: result.record?.totalDays || 0,
        });

        return result;
    }
);
