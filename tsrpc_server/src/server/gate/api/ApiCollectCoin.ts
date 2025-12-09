import { ApiCall } from "tsrpc";
import { ReqCollectCoin, ResCollectCoin } from "../../../tsrpc/protocols/gate/PtlCollectCoin";
import { UserDB } from "../data/UserDB";

export async function ApiCollectCoin(call: ApiCall<ReqCollectCoin, ResCollectCoin>) {
    const user = await UserDB.getUserById(call.req.userId); // UserDB.getUserById 改为异步
    
    if (!user) {
        call.error("用户不存在");
        return;
    }

    // 防作弊简单检查：单次收集不能超过 50
    if (call.req.amount > 50) {
        call.error("单次收集金币过多");
        return;
    }

    user.gold += call.req.amount;
    await UserDB.updateUser(user.userId, { gold: user.gold }); // 更新用户数据

    call.succ({
        currentGold: user.gold
    });
}
