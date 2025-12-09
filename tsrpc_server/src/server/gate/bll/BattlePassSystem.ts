/**
 * 🎫 赛季通行证系统 (Battle Pass)
 *
 * 功能：
 * 1. 免费通行证
 * 2. 付费通行证
 * 3. 通行证等级（1-100级）
 * 4. 奖励轨道（免费/付费）
 * 5. 任务系统集成
 * 6. 经验加速
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';
import { ObjectId } from 'mongodb';

export interface BattlePassData {
    _id?: ObjectId;
    userId: string;
    seasonId: string;
    level: number;
    exp: number;
    isPremium: boolean;
    claimedRewards: number[];
    purchasedAt?: number;
}

export interface BattlePassReward {
    level: number;
    freeReward?: { gold?: number; tickets?: number; items?: string[] };
    premiumReward?: { gold?: number; tickets?: number; items?: string[]; skins?: string[] };
}

export class BattlePassSystem {
    private static readonly MAX_LEVEL = 100;
    private static readonly EXP_PER_LEVEL = 1000;
    private static readonly PREMIUM_PRICE = 9.99;

    static async getBattlePassInfo(userId: string, seasonId: string): Promise<BattlePassData> {
        const collection = MongoDBService.getCollection<BattlePassData>('battle_pass');
        let data = await collection.findOne({ userId, seasonId }) as BattlePassData | null;

        if (!data) {
            data = {
                userId,
                seasonId,
                level: 1,
                exp: 0,
                isPremium: false,
                claimedRewards: []
            };
            await collection.insertOne(data);
        }

        return data;
    }

    static async addExp(userId: string, seasonId: string, exp: number): Promise<{
        success: boolean;
        leveledUp: boolean;
        newLevel?: number;
    }> {
        const data = await this.getBattlePassInfo(userId, seasonId);
        let currentExp = data.exp + exp;
        let currentLevel = data.level;
        let leveledUp = false;

        while (currentExp >= this.EXP_PER_LEVEL && currentLevel < this.MAX_LEVEL) {
            currentExp -= this.EXP_PER_LEVEL;
            currentLevel++;
            leveledUp = true;
        }

        const collection = MongoDBService.getCollection<BattlePassData>('battle_pass');
        await collection.updateOne(
            { userId, seasonId },
            { $set: { level: currentLevel, exp: currentExp } }
        );

        return { success: true, leveledUp, newLevel: currentLevel };
    }

    static async purchasePremium(userId: string, seasonId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const collection = MongoDBService.getCollection<BattlePassData>('battle_pass');
        await collection.updateOne(
            { userId, seasonId },
            { $set: { isPremium: true, purchasedAt: Date.now() } }
        );

        return { success: true };
    }

    static async claimReward(userId: string, seasonId: string, level: number): Promise<{
        success: boolean;
        error?: string;
    }> {
        const data = await this.getBattlePassInfo(userId, seasonId);

        if (level > data.level) {
            return { success: false, error: '等级不足' };
        }

        if (data.claimedRewards.includes(level)) {
            return { success: false, error: '已领取' };
        }

        // TODO: 发放奖励

        const collection = MongoDBService.getCollection<BattlePassData>('battle_pass');
        await collection.updateOne(
            { userId, seasonId },
            { $push: { claimedRewards: level } }
        );

        return { success: true };
    }
}
