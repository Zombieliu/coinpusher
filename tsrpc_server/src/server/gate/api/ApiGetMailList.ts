import { ApiCall } from "tsrpc";
import { ReqGetMailList, ResGetMailList } from "../../../tsrpc/protocols/gate/PtlGetMailList";
import { MailSystem } from "../bll/MailSystem";
import { ErrorHandler, apiWrapper, validateRequired } from "../../utils/ErrorHandler";
import { Logger } from "../../utils/Logger";

/**
 * 获取邮件列表API (带分页)
 */
export const ApiGetMailList = apiWrapper<ReqGetMailList, ResGetMailList>(
    async (call: ApiCall<ReqGetMailList, ResGetMailList>) => {
        // 参数验证
        validateRequired(call.req.userId, 'userId');

        // 获取邮件列表（带分页）
        const result = await MailSystem.getMailList(call.req.userId, {
            status: call.req.status,
            page: call.req.page,
            pageSize: call.req.pageSize
        });

        // 获取未读数量
        const unreadCount = await MailSystem.getUnreadCount(call.req.userId);

        Logger.info('Mail list retrieved', {
            userId: call.req.userId,
            total: result.total,
            page: result.page,
            unreadCount
        });

        return {
            mails: result.mails,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            hasMore: result.hasMore,
            unreadCount
        };
    }
);
