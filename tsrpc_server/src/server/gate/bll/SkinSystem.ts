/**
 * 🎨 皮肤系统
 *
 * 功能：
 * 1. 皮肤商店
 * 2. 皮肤装备/切换
 * 3. 皮肤类型（推币机、金币、动画）
 * 4. 稀有度分级
 * 5. 限定皮肤
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { ObjectId } from 'mongodb';

export enum SkinType {
    Machine = 'machine',
    Coin = 'coin',
    Animation = 'animation'
}

export enum SkinRarity {
    Common = 'common',
    Rare = 'rare',
    Epic = 'epic',
    Legendary = 'legendary'
}

export interface Skin {
    skinId: string;
    name: string;
    type: SkinType;
    rarity: SkinRarity;
    price?: number;
    isLimited: boolean;
    unlockLevel?: number;
    vipRequired?: number;
}

export interface UserSkin {
    _id?: ObjectId;
    userId: string;
    ownedSkins: string[];
    equippedSkins: { [key in SkinType]?: string };
}

export class SkinSystem {
    private static readonly SKINS: Skin[] = [
        { skinId: 'machine_default', name: '默认推币机', type: SkinType.Machine, rarity: SkinRarity.Common, isLimited: false },
        { skinId: 'machine_gold', name: '黄金推币机', type: SkinType.Machine, rarity: SkinRarity.Rare, price: 500, isLimited: false },
        { skinId: 'coin_rainbow', name: '彩虹金币', type: SkinType.Coin, rarity: SkinRarity.Epic, price: 1000, isLimited: false },
        { skinId: 'skin_vip10', name: 'VIP至尊', type: SkinType.Machine, rarity: SkinRarity.Legendary, vipRequired: 10, isLimited: true }
    ];

    static async getUserSkins(userId: string): Promise<UserSkin> {
        const collection = MongoDBService.getCollection<UserSkin>('user_skins');
        let data = await collection.findOne({ userId }) as UserSkin | null;

        if (!data) {
            data = {
                userId,
                ownedSkins: ['machine_default'],
                equippedSkins: {}
            };
            await collection.insertOne(data);
        }

        return data;
    }

    static async unlockSkin(userId: string, skinId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const collection = MongoDBService.getCollection<UserSkin>('user_skins');
        const data = await this.getUserSkins(userId);

        if (data.ownedSkins.includes(skinId)) {
            return { success: false, error: '已拥有该皮肤' };
        }

        await collection.updateOne(
            { userId },
            { $push: { ownedSkins: skinId } }
        );

        return { success: true };
    }

    static async equipSkin(userId: string, skinId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const data = await this.getUserSkins(userId);

        if (!data.ownedSkins.includes(skinId)) {
            return { success: false, error: '未拥有该皮肤' };
        }

        const skin = this.SKINS.find(s => s.skinId === skinId);
        if (!skin) {
            return { success: false, error: '皮肤不存在' };
        }

        const collection = MongoDBService.getCollection<UserSkin>('user_skins');
        await collection.updateOne(
            { userId },
            { $set: { [`equippedSkins.${skin.type}`]: skinId } }
        );

        return { success: true };
    }

    /**
     * 移除已拥有的皮肤（用于退款回退）
     */
    static async removeSkin(userId: string, skinId: string): Promise<{ success: boolean; error?: string }> {
        const collection = MongoDBService.getCollection<UserSkin>('user_skins');
        const data = await this.getUserSkins(userId);

        if (!data.ownedSkins.includes(skinId)) {
            return { success: false, error: '未拥有该皮肤' };
        }

        // 保护默认皮肤
        if (skinId === 'machine_default') {
            return { success: false, error: '默认皮肤不可移除' };
        }

        // 清除装备
        const skin = this.SKINS.find(s => s.skinId === skinId);
        if (!skin) {
            return { success: false, error: '皮肤不存在' };
        }

        await collection.updateOne(
            { userId },
            {
                $pull: { ownedSkins: skinId },
                $unset: { [`equippedSkins.${skin.type}`]: "" }
            }
        );

        return { success: true };
    }

    static getAllSkins(): Skin[] {
        return this.SKINS;
    }
}
