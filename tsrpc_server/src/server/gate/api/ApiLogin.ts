import { ApiCall } from "tsrpc";
import { ReqLogin, ResLogin } from "../../../tsrpc/protocols/gate/PtlLogin";
import { UserDB } from "../data/UserDB";

export async function ApiLogin(call: ApiCall<ReqLogin, ResLogin>) {
    let user = await UserDB.getUser(call.req.username); // UserDB.getUser 改为异步
    let offlineReward = 0;

    if (!user) {
        user = await UserDB.createUser(call.req.username); // UserDB.createUser 改为异步
    } else {
        // 计算离线奖励
        const now = Date.now();
        const diffMs = now - user.lastLoginTime;
        // 每分钟 1 金币
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        const rewardPerMinute = 1;
        const maxReward = 100; // 最多 100 金币
        
        offlineReward = Math.min(diffMinutes * rewardPerMinute, maxReward);
        
        if (offlineReward > 0) {
            user.gold += offlineReward;
        }
        
        user.lastLoginTime = now;
        await UserDB.updateUser(user.userId, { gold: user.gold, lastLoginTime: user.lastLoginTime }); // 更新用户数据
    }

    call.succ({
        userId: user.userId,
        token: "mock_token_" + user.userId,
        gold: user.gold,
        offlineReward,
        matchUrl: "http://127.0.0.1:3001" // 默认 Match Server 地址
    });
}