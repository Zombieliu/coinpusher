/**
 * 🎉 活动系统
 *
 * 功能：
 * 1. 限时活动
 * 2. 活动类型（充值、消费、登陆、推币）
 * 3. 活动奖励
 * 4. 活动进度
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { ObjectId } from 'mongodb';

export enum EventType {
    Recharge = 'recharge',
    Consume = 'consume',
    Login = 'login',
    Push = 'push'
}

export interface Event {
    eventId: string;
    name: string;
    type: EventType;
    startTime: number;
    endTime: number;
    targets: EventTarget[];
    rewards: any[];
}

export interface EventTarget {
    targetId: string;
    description: string;
    requirement: number;
    reward: any;
}

export interface UserEventProgress {
    _id?: ObjectId;
    userId: string;
    eventId: string;
    progress: { [targetId: string]: number };
    claimedRewards: string[];
}

export class EventSystem {
    static async getActiveEvents(): Promise<Event[]> {
        const collection = MongoDBService.getCollection<Event>('events');
        const now = Date.now();

        return await collection.find({
            startTime: { $lte: now },
            endTime: { $gte: now }
        }).toArray();
    }

    static async getUserEventProgress(userId: string, eventId: string): Promise<UserEventProgress> {
        const collection = MongoDBService.getCollection<UserEventProgress>('user_event_progress');
        let data = await collection.findOne({ userId, eventId }) as UserEventProgress | null;

        if (!data) {
            data = {
                userId,
                eventId,
                progress: {},
                claimedRewards: []
            };
            await collection.insertOne(data);
        }

        return data;
    }

    static async updateProgress(userId: string, eventId: string, targetId: string, value: number): Promise<void> {
        const collection = MongoDBService.getCollection<UserEventProgress>('user_event_progress');
        await collection.updateOne(
            { userId, eventId },
            { $inc: { [`progress.${targetId}`]: value } },
            { upsert: true }
        );
    }

    static async claimEventReward(userId: string, eventId: string, targetId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const progress = await this.getUserEventProgress(userId, eventId);

        if (progress.claimedRewards.includes(targetId)) {
            return { success: false, error: '已领取' };
        }

        // 获取活动配置
        const eventCollection = MongoDBService.getCollection<Event>('events');
        const event = await eventCollection.findOne({ eventId });

        if (!event) {
            return { success: false, error: '活动不存在' };
        }

        // 检查活动是否有效
        const now = Date.now();
        if (now < event.startTime || now > event.endTime) {
            return { success: false, error: '活动已过期' };
        }

        // 查找对应的目标配置
        const target = event.targets.find(t => t.targetId === targetId);
        if (!target) {
            return { success: false, error: '奖励目标不存在' };
        }

        // 检查进度是否达标
        const currentProgress = progress.progress[targetId] || 0;
        if (currentProgress < target.requirement) {
            return {
                success: false,
                error: `进度不足，需要${target.requirement}，当前${currentProgress}`
            };
        }

        // 发放奖励
        const { UserDB } = await import('../data/UserDB');
        const reward = target.reward;

        if (reward.gold && reward.gold > 0) {
            await UserDB.addGold(userId, reward.gold);
        }

        if (reward.tickets && reward.tickets > 0) {
            await UserDB.addTickets(userId, reward.tickets);
        }

        if (reward.items && reward.items.length > 0) {
            const { ItemSystem } = await import('./ItemSystem');
            for (const item of reward.items) {
                await ItemSystem.addItem(userId, item.itemId, item.quantity);
            }
        }

        if (reward.exp && reward.exp > 0) {
            const { LevelSystem, ExpSource } = await import('./LevelSystem');
            await LevelSystem.addExp(userId, reward.exp, ExpSource.Activity);
        }

        // 标记为已领取
        const collection = MongoDBService.getCollection<UserEventProgress>('user_event_progress');
        await collection.updateOne(
            { userId, eventId },
            { $push: { claimedRewards: targetId } }
        );

        return { success: true };
    }
}
