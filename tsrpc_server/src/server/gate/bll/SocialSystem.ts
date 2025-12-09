/**
 * 👥 社交系统 - 好友功能
 *
 * 功能：
 * 1. 好友申请/接受/拒绝/删除
 * 2. 好友列表/在线状态
 * 3. 好友赠送/互助
 * 4. 好友推荐
 * 5. 黑名单
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';
import { ObjectId } from 'mongodb';

/** 好友状态 */
export enum FriendStatus {
    Pending = 'pending',       // 待接受
    Accepted = 'accepted',     // 已接受
    Rejected = 'rejected',     // 已拒绝
    Blocked = 'blocked'        // 已拉黑
}

/** 好友信息 */
export interface Friend {
    userId: string;
    username: string;
    status: FriendStatus;
    addedAt: number;           // 添加时间
    lastInteraction?: number;  // 最后互动时间
}

/** 好友申请 */
export interface FriendRequest {
    requestId: string;
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    message?: string;
    status: FriendStatus;
    createdAt: number;
}

/** 用户社交数据 */
export interface UserSocialData {
    _id?: ObjectId;
    userId: string;
    friends: Friend[];         // 好友列表
    blacklist: string[];       // 黑名单
    sentRequests: string[];    // 已发送的申请
    receivedRequests: string[]; // 收到的申请
    dailyGiftsSent: number;    // 今日已赠送次数
    dailyGiftsReceived: number;// 今日已接收次数
    lastGiftReset: string;     // 上次重置日期
}

export class SocialSystem {
    private static readonly MAX_FRIENDS = 100;           // 最大好友数
    private static readonly MAX_REQUESTS = 50;           // 最大申请数
    private static readonly DAILY_GIFT_LIMIT = 20;      // 每日赠送上限
    private static readonly GIFT_AMOUNT = 50;            // 赠送金币数

    /**
     * 在线状态Key前缀
     */
    private static readonly ONLINE_KEY_PREFIX = 'user:online:';

    /**
     * 发送好友申请
     */
    static async sendFriendRequest(
        fromUserId: string,
        toUserId: string,
        message?: string
    ): Promise<{
        success: boolean;
        error?: string;
        requestId?: string;
    }> {
        if (fromUserId === toUserId) {
            return { success: false, error: '不能添加自己为好友' };
        }

        // 获取双方社交数据
        const fromData = await this.getUserSocialData(fromUserId);
        const toData = await this.getUserSocialData(toUserId);

        // 检查是否在黑名单
        if (toData.blacklist.includes(fromUserId)) {
            return { success: false, error: '对方已将你拉黑' };
        }

        // 检查是否已经是好友
        if (fromData.friends.find(f => f.userId === toUserId && f.status === FriendStatus.Accepted)) {
            return { success: false, error: '已经是好友' };
        }

        // 检查好友上限
        if (fromData.friends.filter(f => f.status === FriendStatus.Accepted).length >= this.MAX_FRIENDS) {
            return { success: false, error: '好友数量已达上限' };
        }

        // 检查申请上限
        if (fromData.sentRequests.length >= this.MAX_REQUESTS) {
            return { success: false, error: '待处理申请过多' };
        }

        // 创建申请
        const fromUser = await UserDB.getUserById(fromUserId);
        const requestId = `req_${Date.now()}_${fromUserId}_${toUserId}`;

        const request: FriendRequest = {
            requestId,
            fromUserId,
            fromUsername: fromUser!.username,
            toUserId,
            message,
            status: FriendStatus.Pending,
            createdAt: Date.now()
        };

        // 保存到MongoDB
        const collection = MongoDBService.getCollection('friend_requests');
        await collection.insertOne(request);

        // 更新社交数据
        fromData.sentRequests.push(requestId);
        toData.receivedRequests.push(requestId);

        await this.updateUserSocialData(fromUserId, fromData);
        await this.updateUserSocialData(toUserId, toData);

        console.log(`[SocialSystem] ${fromUserId} 向 ${toUserId} 发送好友申请`);

        return { success: true, requestId };
    }

    /**
     * 接受好友申请
     */
    static async acceptFriendRequest(
        userId: string,
        requestId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        // 获取申请
        const collection = MongoDBService.getCollection<FriendRequest>('friend_requests');
        const request = await collection.findOne({ requestId });

        if (!request) {
            return { success: false, error: '申请不存在' };
        }

        if (request.toUserId !== userId) {
            return { success: false, error: '无权限' };
        }

        if (request.status !== FriendStatus.Pending) {
            return { success: false, error: '申请已处理' };
        }

        // 获取双方社交数据
        const userData = await this.getUserSocialData(userId);
        const friendData = await this.getUserSocialData(request.fromUserId);

        // 检查好友上限
        if (userData.friends.filter(f => f.status === FriendStatus.Accepted).length >= this.MAX_FRIENDS) {
            return { success: false, error: '好友数量已达上限' };
        }

        // 添加好友关系
        const now = Date.now();

        userData.friends.push({
            userId: request.fromUserId,
            username: request.fromUsername,
            status: FriendStatus.Accepted,
            addedAt: now
        });

        const toUser = await UserDB.getUserById(userId);
        friendData.friends.push({
            userId: userId,
            username: toUser!.username,
            status: FriendStatus.Accepted,
            addedAt: now
        });

        // 移除申请记录
        userData.receivedRequests = userData.receivedRequests.filter(id => id !== requestId);
        friendData.sentRequests = friendData.sentRequests.filter(id => id !== requestId);

        // 更新申请状态
        await collection.updateOne(
            { requestId },
            { $set: { status: FriendStatus.Accepted } }
        );

        // 保存社交数据
        await this.updateUserSocialData(userId, userData);
        await this.updateUserSocialData(request.fromUserId, friendData);

        console.log(`[SocialSystem] ${userId} 接受了 ${request.fromUserId} 的好友申请`);

        return { success: true };
    }

    /**
     * 拒绝好友申请
     */
    static async rejectFriendRequest(
        userId: string,
        requestId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const collection = MongoDBService.getCollection<FriendRequest>('friend_requests');
        const request = await collection.findOne({ requestId });

        if (!request) {
            return { success: false, error: '申请不存在' };
        }

        if (request.toUserId !== userId) {
            return { success: false, error: '无权限' };
        }

        // 更新申请状态
        await collection.updateOne(
            { requestId },
            { $set: { status: FriendStatus.Rejected } }
        );

        // 移除申请记录
        const userData = await this.getUserSocialData(userId);
        const friendData = await this.getUserSocialData(request.fromUserId);

        userData.receivedRequests = userData.receivedRequests.filter(id => id !== requestId);
        friendData.sentRequests = friendData.sentRequests.filter(id => id !== requestId);

        await this.updateUserSocialData(userId, userData);
        await this.updateUserSocialData(request.fromUserId, friendData);

        console.log(`[SocialSystem] ${userId} 拒绝了 ${request.fromUserId} 的好友申请`);

        return { success: true };
    }

    /**
     * 删除好友
     */
    static async removeFriend(
        userId: string,
        friendId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const userData = await this.getUserSocialData(userId);
        const friendData = await this.getUserSocialData(friendId);

        // 移除好友关系
        userData.friends = userData.friends.filter(f => f.userId !== friendId);
        friendData.friends = friendData.friends.filter(f => f.userId !== userId);

        await this.updateUserSocialData(userId, userData);
        await this.updateUserSocialData(friendId, friendData);

        console.log(`[SocialSystem] ${userId} 删除了好友 ${friendId}`);

        return { success: true };
    }

    /**
     * 拉黑用户
     */
    static async blockUser(
        userId: string,
        targetUserId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const userData = await this.getUserSocialData(userId);

        if (userData.blacklist.includes(targetUserId)) {
            return { success: false, error: '已在黑名单' };
        }

        // 添加到黑名单
        userData.blacklist.push(targetUserId);

        // 移除好友关系（如果存在）
        userData.friends = userData.friends.filter(f => f.userId !== targetUserId);

        await this.updateUserSocialData(userId, userData);

        console.log(`[SocialSystem] ${userId} 拉黑了 ${targetUserId}`);

        return { success: true };
    }

    /**
     * 取消拉黑
     */
    static async unblockUser(
        userId: string,
        targetUserId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const userData = await this.getUserSocialData(userId);

        userData.blacklist = userData.blacklist.filter(id => id !== targetUserId);

        await this.updateUserSocialData(userId, userData);

        console.log(`[SocialSystem] ${userId} 取消拉黑 ${targetUserId}`);

        return { success: true };
    }

    /**
     * 赠送礼物
     */
    static async sendGift(
        fromUserId: string,
        toUserId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const fromData = await this.getUserSocialData(fromUserId);

        // 检查是否是好友
        if (!fromData.friends.find(f => f.userId === toUserId && f.status === FriendStatus.Accepted)) {
            return { success: false, error: '不是好友' };
        }

        // 检查今日赠送次数
        const today = new Date().toISOString().split('T')[0];
        if (fromData.lastGiftReset !== today) {
            fromData.dailyGiftsSent = 0;
            fromData.lastGiftReset = today;
        }

        if (fromData.dailyGiftsSent >= this.DAILY_GIFT_LIMIT) {
            return { success: false, error: '今日赠送次数已用完' };
        }

        // 发放金币
        const toUser = await UserDB.getUserById(toUserId);
        if (!toUser) {
            return { success: false, error: '用户不存在' };
        }

        await UserDB.updateUser(toUserId, {
            gold: toUser.gold + this.GIFT_AMOUNT
        });

        // 更新赠送次数
        fromData.dailyGiftsSent++;
        await this.updateUserSocialData(fromUserId, fromData);

        // 更新最后互动时间
        const friend = fromData.friends.find(f => f.userId === toUserId);
        if (friend) {
            friend.lastInteraction = Date.now();
        }

        console.log(`[SocialSystem] ${fromUserId} 赠送 ${this.GIFT_AMOUNT} 金币给 ${toUserId}`);

        return { success: true };
    }

    /**
     * 获取好友列表
     */
    static async getFriendList(userId: string): Promise<Array<Friend & { online: boolean }>> {
        const data = await this.getUserSocialData(userId);
        const friends = data.friends.filter(f => f.status === FriendStatus.Accepted);

        // 获取在线状态
        const friendsWithStatus = await Promise.all(
            friends.map(async (friend) => ({
                ...friend,
                online: await this.isUserOnline(friend.userId)
            }))
        );

        return friendsWithStatus;
    }

    /**
     * 获取收到的好友申请
     */
    static async getReceivedRequests(userId: string): Promise<FriendRequest[]> {
        const data = await this.getUserSocialData(userId);
        const collection = MongoDBService.getCollection<FriendRequest>('friend_requests');

        const requests = await collection
            .find({
                requestId: { $in: data.receivedRequests },
                status: FriendStatus.Pending
            })
            .toArray();

        return requests;
    }

    /**
     * 设置用户在线状态
     */
    static async setUserOnline(userId: string, online: boolean): Promise<void> {
        const key = `${this.ONLINE_KEY_PREFIX}${userId}`;
        if (online) {
            await DragonflyDBService.set(key, '1', 300); // 5分钟过期
        } else {
            await DragonflyDBService.del(key);
        }
    }

    /**
     * 判断用户是否在线
     */
    static async isUserOnline(userId: string): Promise<boolean> {
        const key = `${this.ONLINE_KEY_PREFIX}${userId}`;
        return await DragonflyDBService.exists(key);
    }

    /**
     * 获取推荐好友（基于共同好友算法）
     */
    static async getRecommendedFriends(userId: string, limit: number = 10): Promise<Array<{
        userId: string;
        username: string;
        mutualFriends: number;
    }>> {
        const userData = await this.getUserSocialData(userId);
        const myFriends = userData.friends.map(f => f.userId);
        const blacklist = userData.blacklist;

        // 已经是好友或在黑名单中的用户不推荐
        const excludeUsers = new Set([userId, ...myFriends, ...blacklist]);

        // 统计每个潜在好友与我的共同好友数
        const mutualFriendsCount = new Map<string, number>();

        // 遍历我的好友的好友列表
        for (const friendId of myFriends) {
            const friendData = await this.getUserSocialData(friendId);
            for (const friendOfFriendId of friendData.friends.map(f => f.userId)) {
                // 跳过已排除的用户
                if (excludeUsers.has(friendOfFriendId)) {
                    continue;
                }

                // 累计共同好友数
                const count = mutualFriendsCount.get(friendOfFriendId) || 0;
                mutualFriendsCount.set(friendOfFriendId, count + 1);
            }
        }

        // 按共同好友数排序
        const recommendations = Array.from(mutualFriendsCount.entries())
            .sort((a, b) => b[1] - a[1]) // 降序
            .slice(0, limit);

        // 获取用户信息
        const { UserDB } = await import('../data/UserDB');
        const result = [];

        for (const [recommendedUserId, mutualCount] of recommendations) {
            const user = await UserDB.getUserById(recommendedUserId);
            if (user) {
                result.push({
                    userId: recommendedUserId,
                    username: user.username,
                    mutualFriends: mutualCount
                });
            }
        }

        return result;
    }

    /**
     * 获取用户社交数据
     */
    private static async getUserSocialData(userId: string): Promise<UserSocialData> {
        const collection = MongoDBService.getCollection<UserSocialData>('user_social');
        let data = await collection.findOne({ userId }) as UserSocialData | null;

        if (!data) {
            data = {
                userId,
                friends: [],
                blacklist: [],
                sentRequests: [],
                receivedRequests: [],
                dailyGiftsSent: 0,
                dailyGiftsReceived: 0,
                lastGiftReset: new Date().toISOString().split('T')[0]
            };
            await collection.insertOne(data);
        }

        return data;
    }

    /**
     * 更新用户社交数据
     */
    private static async updateUserSocialData(userId: string, data: UserSocialData): Promise<void> {
        const collection = MongoDBService.getCollection<UserSocialData>('user_social');
        await collection.updateOne(
            { userId },
            { $set: data },
            { upsert: true }
        );
    }
}
