import { ApiCall } from "tsrpc";
import { ReqSendFriendGift, ResSendFriendGift } from "../../../tsrpc/protocols/gate/PtlSendFriendGift";
import { SocialSystem, FriendStatus } from "../bll/SocialSystem";

export default async function (call: ApiCall<ReqSendFriendGift, ResSendFriendGift>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }

    const friendId = call.req.friendId;
    const social = await SocialSystem.getUserSocialData(userId);
    const friendRel = social.friends.find(f => f.userId === friendId && f.status === FriendStatus.Accepted);
    if (!friendRel) {
        call.succ({ success: false, error: '尚未成为好友' });
        return;
    }

    // 简单赠礼：检查每日上限并递增计数
    const today = new Date().toISOString().split('T')[0];
    if (social.lastGiftReset !== today) {
        social.dailyGiftsSent = 0;
        social.dailyGiftsReceived = 0;
        social.lastGiftReset = today;
    }
    if (social.dailyGiftsSent >= 20) {
        call.succ({ success: false, error: '今日赠送次数已达上限' });
        return;
    }
    social.dailyGiftsSent += 1;
    await SocialSystem.updateUserSocialData(userId, social);

    call.succ({ success: true });
}
