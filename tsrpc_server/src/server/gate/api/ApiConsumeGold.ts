import { ApiCall } from "tsrpc";
import { ReqConsumeGold, ResConsumeGold } from "../../../tsrpc/protocols/gate/PtlConsumeGold";
import { UserDB } from "../data/UserDB";

export async function ApiConsumeGold(call: ApiCall<ReqConsumeGold, ResConsumeGold>) {
    const user = await UserDB.getUserById(call.req.userId); // UserDB.getUserById 改为异步
    
    if (!user) {
        call.error("用户不存在");
        return;
    }

    if (user.gold < call.req.amount) {
        call.error("金币不足");
        return;
    }

    user.gold -= call.req.amount;
    await UserDB.updateUser(user.userId, { gold: user.gold }); // 更新用户数据

    call.succ({
        currentGold: user.gold
    });
}
