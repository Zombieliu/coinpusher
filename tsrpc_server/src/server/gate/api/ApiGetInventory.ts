import { ApiCall } from "tsrpc";
import { ReqGetInventory, ResGetInventory } from "../../../tsrpc/protocols/gate/PtlGetInventory";
import { UserDB } from "../data/UserDB";
import { ErrorHandler, apiWrapper, validateRequired } from "../../utils/ErrorHandler";

/**
 * 获取背包API
 *
 * 使用 ErrorHandler 统一错误处理
 */
export const ApiGetInventory = apiWrapper<ReqGetInventory, ResGetInventory>(
    async (call: ApiCall<ReqGetInventory, ResGetInventory>) => {
        // 参数验证
        validateRequired(call.req.userId, 'userId');

        // 查询用户
        const user = await UserDB.getUserById(call.req.userId);

        if (!user) {
            throw ErrorHandler.notFound('用户不存在', { userId: call.req.userId });
        }

        // 返回结果
        return {
            inventory: (user.inventory || []).map(item => ({
                itemId: item.itemId,
                itemName: item.itemName,
                itemType: item.itemType,
                rarity: item.rarity,
                quantity: item.quantity,
                obtainedAt: item.obtainedAt
            })),
            tickets: user.tickets || 0,
            totalItems: user.inventory?.length || 0
        };
    }
);
