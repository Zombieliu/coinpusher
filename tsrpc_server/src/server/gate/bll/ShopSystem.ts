/**
 * 🛒 商城系统
 *
 * 功能：
 * 1. 商品管理
 * 2. 商品上架/下架
 * 3. 限时优惠
 * 4. 购买限制
 * 5. 商品分类
 * 6. 热门推荐
 *
 * 商品类型：
 * - 道具（消耗品）
 * - 赛季通行证
 * - 金币包
 * - 彩票包
 * - VIP会员
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';
import { ItemSystem } from './ItemSystem';

/** 商品类型 */
export enum ProductType {
    Item = 'item',              // 道具
    BattlePass = 'battle_pass', // 赛季通行证
    GoldPack = 'gold_pack',     // 金币包
    TicketPack = 'ticket_pack', // 彩票包
    VIP = 'vip',                // VIP会员
    Skin = 'skin'               // 皮肤
}

/** 货币类型 */
export enum CurrencyType {
    Gold = 'gold',              // 金币（游戏内货币）
    RMB = 'rmb',                // 人民币
    USD = 'usd'                 // 美元
}

/** 商品状态 */
export enum ProductStatus {
    Available = 'available',    // 可购买
    SoldOut = 'sold_out',       // 售罄
    ComingSoon = 'coming_soon', // 即将上架
    Disabled = 'disabled'       // 已下架
}

/** 商品配置 */
export interface ProductConfig {
    productId: string;
    type: ProductType;
    name: string;
    description: string;
    icon?: string;
    status: ProductStatus;

    // 价格
    price: number;
    currency: CurrencyType;
    originalPrice?: number;     // 原价（用于显示折扣）
    discount?: number;          // 折扣（0-100）

    // 内容
    content: ProductContent;

    // 限制
    dailyLimit?: number;        // 每日购买限制
    totalLimit?: number;        // 总购买限制
    levelRequirement?: number;  // 等级要求
    vipRequirement?: number;    // VIP等级要求

    // 时间
    startTime?: number;         // 开始时间
    endTime?: number;           // 结束时间

    // 标签
    tags: string[];             // 标签（hot, new, discount）
    category: string;           // 分类
    sortOrder: number;          // 排序
}

/** 商品内容 */
export interface ProductContent {
    // 道具包
    items?: Array<{
        itemId: string;
        quantity: number;
    }>;

    // 金币包
    goldAmount?: number;
    bonusGold?: number;         // 额外赠送金币

    // 彩票包
    ticketAmount?: number;
    bonusTickets?: number;

    // VIP
    vipLevel?: number;
    vipDays?: number;
    vipDuration?: number;

    // 赛季通行证
    seasonId?: string;

    // 皮肤
    skinId?: string;
    skins?: string[];
}

/** 购买记录 */
export interface PurchaseRecord {
    recordId: string;
    userId: string;
    productId: string;
    productName: string;
    price: number;
    currency: CurrencyType;
    content: ProductContent;
    purchasedAt: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
}

/** 购买统计 */
export interface PurchaseStats {
    userId: string;
    totalSpent: number;         // 总消费
    totalPurchases: number;     // 总购买次数
    firstPurchaseAt?: number;   // 首次购买时间
    lastPurchaseAt?: number;    // 最后购买时间
}

export class ShopSystem {
    /**
     * 商品配置表
     */
    private static readonly PRODUCT_CONFIGS: Record<string, ProductConfig> = {
        // 金币包
        'gold_pack_small': {
            productId: 'gold_pack_small',
            type: ProductType.GoldPack,
            name: '小额金币包',
            description: '100金币',
            status: ProductStatus.Available,
            price: 6,
            currency: CurrencyType.RMB,
            content: {
                goldAmount: 100
            },
            tags: [],
            category: 'gold',
            sortOrder: 1
        },

        'gold_pack_medium': {
            productId: 'gold_pack_medium',
            type: ProductType.GoldPack,
            name: '中额金币包',
            description: '500金币 + 50额外赠送',
            status: ProductStatus.Available,
            price: 30,
            currency: CurrencyType.RMB,
            content: {
                goldAmount: 500,
                bonusGold: 50
            },
            tags: ['hot'],
            category: 'gold',
            sortOrder: 2
        },

        'gold_pack_large': {
            productId: 'gold_pack_large',
            type: ProductType.GoldPack,
            name: '大额金币包',
            description: '1500金币 + 300额外赠送',
            status: ProductStatus.Available,
            price: 98,
            currency: CurrencyType.RMB,
            content: {
                goldAmount: 1500,
                bonusGold: 300
            },
            tags: ['discount'],
            category: 'gold',
            sortOrder: 3
        },

        // 彩票包
        'ticket_pack_5': {
            productId: 'ticket_pack_5',
            type: ProductType.TicketPack,
            name: '彩票包 x5',
            description: '5张彩票',
            status: ProductStatus.Available,
            price: 500,
            currency: CurrencyType.Gold,
            content: {
                ticketAmount: 5
            },
            tags: [],
            category: 'ticket',
            sortOrder: 1
        },

        'ticket_pack_20': {
            productId: 'ticket_pack_20',
            type: ProductType.TicketPack,
            name: '彩票包 x20',
            description: '20张彩票 + 5张额外赠送',
            status: ProductStatus.Available,
            price: 1800,
            currency: CurrencyType.Gold,
            content: {
                ticketAmount: 20,
                bonusTickets: 5
            },
            tags: ['hot'],
            category: 'ticket',
            sortOrder: 2
        },

        // 道具包
        'item_pack_starter': {
            productId: 'item_pack_starter',
            type: ProductType.Item,
            name: '新手礼包',
            description: '包含多种实用道具',
            status: ProductStatus.Available,
            price: 18,
            currency: CurrencyType.RMB,
            content: {
                items: [
                    { itemId: 'item_multiplier_2x', quantity: 5 },
                    { itemId: 'item_magnet', quantity: 3 },
                    { itemId: 'item_hammer', quantity: 2 }
                ]
            },
            tags: ['new'],
            category: 'item',
            sortOrder: 1
        },

        // 赛季通行证
        'battle_pass_season_1': {
            productId: 'battle_pass_season_1',
            type: ProductType.BattlePass,
            name: '赛季通行证 S1',
            description: '解锁高级奖励轨道',
            status: ProductStatus.Available,
            price: 490,
            currency: CurrencyType.Gold,
            originalPrice: 690,
            discount: 29,
            content: {
                seasonId: 'season_1'
            },
            dailyLimit: 1,
            tags: ['hot', 'discount'],
            category: 'season',
            sortOrder: 1
        },

        // VIP会员
        'vip_monthly': {
            productId: 'vip_monthly',
            type: ProductType.VIP,
            name: 'VIP月卡',
            description: '30天VIP特权',
            status: ProductStatus.Available,
            price: 30,
            currency: CurrencyType.RMB,
            content: {
                vipLevel: 1,
                vipDays: 30
            },
            tags: [],
            category: 'vip',
            sortOrder: 1
        }
    };

    /**
     * 获取可购买商品列表
     */
    static async getAvailableProducts(userId?: string): Promise<ProductConfig[]> {
        const now = Date.now();
        return Object.values(this.PRODUCT_CONFIGS).filter(product => {
            if (product.status !== ProductStatus.Available) {
                return false;
            }
            if (product.startTime && product.startTime > now) {
                return false;
            }
            if (product.endTime && product.endTime < now) {
                return false;
            }
            return true;
        });
    }

    /**
     * 获取商城商品列表
     */
    static async getShopProducts(
        category?: string,
        tags?: string[]
    ): Promise<ProductConfig[]> {
        let products = Object.values(this.PRODUCT_CONFIGS);

        // 只显示可用商品
        products = products.filter(p => p.status === ProductStatus.Available);

        // 按分类筛选
        if (category) {
            products = products.filter(p => p.category === category);
        }

        // 按标签筛选
        if (tags && tags.length > 0) {
            products = products.filter(p =>
                tags.some(tag => p.tags.includes(tag))
            );
        }

        // 检查时间限制
        const now = Date.now();
        products = products.filter(p => {
            if (p.startTime && now < p.startTime) return false;
            if (p.endTime && now > p.endTime) return false;
            return true;
        });

        // 排序
        products.sort((a, b) => a.sortOrder - b.sortOrder);

        return products;
    }

    /**
     * 获取商品详情
     */
    static getProduct(productId: string): ProductConfig | null {
        return this.PRODUCT_CONFIGS[productId] || null;
    }

    /**
     * 购买商品
     */
    static async purchaseProduct(
        userId: string,
        productId: string
    ): Promise<{
        success: boolean;
        error?: string;
        recordId?: string;
    }> {
        const product = this.getProduct(productId);
        if (!product) {
            return { success: false, error: '商品不存在' };
        }

        // 检查商品状态
        if (product.status !== ProductStatus.Available) {
            return { success: false, error: '商品不可购买' };
        }

        // 检查时间限制
        const now = Date.now();
        if (product.startTime && now < product.startTime) {
            return { success: false, error: '商品未开始销售' };
        }
        if (product.endTime && now > product.endTime) {
            return { success: false, error: '商品已过销售期' };
        }

        // 检查等级要求
        if (product.levelRequirement && product.levelRequirement > 0) {
            const { LevelSystem } = await import('./LevelSystem');
            const levelData = await LevelSystem.getUserLevel(userId);
            if (levelData.level < product.levelRequirement) {
                return { success: false, error: `需要等级${product.levelRequirement}才能购买` };
            }
        }

        // 检查购买限制
        if (product.dailyLimit) {
            const todayPurchases = await this.getDailyPurchaseCount(userId, productId);
            if (todayPurchases >= product.dailyLimit) {
                return { success: false, error: `每日限购${product.dailyLimit}次` };
            }
        }

        if (product.totalLimit) {
            const totalPurchases = await this.getTotalPurchaseCount(userId, productId);
            if (totalPurchases >= product.totalLimit) {
                return { success: false, error: `总共限购${product.totalLimit}次` };
            }
        }

        // 检查货币
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (product.currency === CurrencyType.Gold) {
            if (user.gold < product.price) {
                return { success: false, error: `金币不足，需要${product.price}金币` };
            }

            // 扣除金币
            await UserDB.updateUser(userId, {
                gold: user.gold - product.price
            });
        } else {
            // RMB/USD购买需要调用支付系统
            return { success: false, error: '请使用支付系统进行购买' };
        }

        // 发放商品内容
        await this.deliverProduct(userId, product);

        // 记录购买
        const recordId = `purchase_${Date.now()}_${userId}_${productId}`;
        const record: PurchaseRecord = {
            recordId,
            userId,
            productId,
            productName: product.name,
            price: product.price,
            currency: product.currency,
            content: product.content,
            purchasedAt: Date.now(),
            status: 'completed'
        };

        const collection = MongoDBService.getCollection<PurchaseRecord>('purchase_records');
        await collection.insertOne(record);

        // 更新统计
        await this.updatePurchaseStats(userId, product.price);

        console.log(`[ShopSystem] 用户 ${userId} 购买了 ${product.name}`);

        return { success: true, recordId };
    }

    /**
     * 发放商品内容
     */
    private static async deliverProduct(userId: string, product: ProductConfig): Promise<void> {
        const content = product.content;

        // 发放道具
        if (content.items) {
            for (const item of content.items) {
                await ItemSystem.addItem(userId, item.itemId, item.quantity);
            }
        }

        // 发放金币
        if (content.goldAmount) {
            const user = await UserDB.getUserById(userId);
            if (user) {
                const totalGold = content.goldAmount + (content.bonusGold || 0);
                await UserDB.updateUser(userId, {
                    gold: user.gold + totalGold
                });
            }
        }

        // 发放彩票
        if (content.ticketAmount) {
            const totalTickets = content.ticketAmount + (content.bonusTickets || 0);
            await UserDB.addTickets(userId, totalTickets);
        }

        // 发放赛季通行证
        if (content.seasonId) {
            const { SeasonSystem } = await import('./SeasonSystem');
            await SeasonSystem.purchasePremiumPass(userId, 0); // 0金币，因为已经支付过了
        }

        // 发放VIP
        const vipDuration = content.vipDuration ?? content.vipDays;
        if (content.vipLevel !== undefined && vipDuration) {
            const { VIPSystem } = await import('./VIPSystem');
            await VIPSystem.activateVIP(userId, content.vipLevel as any, vipDuration);
        }

        // 发放皮肤
        if (content.skins && content.skins.length > 0) {
            const { SkinSystem } = await import('./SkinSystem');
            for (const skinId of content.skins) {
                await SkinSystem.unlockSkin(userId, skinId);
            }
        }

        // 发放道具
        if (content.items && content.items.length > 0) {
            const { ItemSystem } = await import('./ItemSystem');
            for (const item of content.items) {
                await ItemSystem.addItem(userId, item.itemId, item.quantity);
            }
        }
    }

    /**
     * 获取每日购买次数
     */
    private static async getDailyPurchaseCount(userId: string, productId: string): Promise<number> {
        const collection = MongoDBService.getCollection<PurchaseRecord>('purchase_records');
        const today = new Date().toISOString().split('T')[0];
        const todayStart = new Date(today).getTime();

        return await collection.countDocuments({
            userId,
            productId,
            purchasedAt: { $gte: todayStart },
            status: 'completed'
        });
    }

    /**
     * 获取总购买次数
     */
    private static async getTotalPurchaseCount(userId: string, productId: string): Promise<number> {
        const collection = MongoDBService.getCollection<PurchaseRecord>('purchase_records');
        return await collection.countDocuments({
            userId,
            productId,
            status: 'completed'
        });
    }

    /**
     * 更新购买统计
     */
    private static async updatePurchaseStats(userId: string, amount: number): Promise<void> {
        const collection = MongoDBService.getCollection<PurchaseStats>('purchase_stats');
        const stats = await collection.findOne({ userId });

        if (stats) {
            await collection.updateOne(
                { userId },
                {
                    $inc: {
                        totalSpent: amount,
                        totalPurchases: 1
                    },
                    $set: {
                        lastPurchaseAt: Date.now()
                    }
                }
            );
        } else {
            const newStats: PurchaseStats = {
                userId,
                totalSpent: amount,
                totalPurchases: 1,
                firstPurchaseAt: Date.now(),
                lastPurchaseAt: Date.now()
            };
            await collection.insertOne(newStats);
        }
    }

    /**
     * 获取用户购买统计
     */
    static async getUserPurchaseStats(userId: string): Promise<PurchaseStats | null> {
        const collection = MongoDBService.getCollection<PurchaseStats>('purchase_stats');
        return await collection.findOne({ userId });
    }

    /**
     * 获取用户购买历史
     */
    static async getPurchaseHistory(
        userId: string,
        limit: number = 50
    ): Promise<PurchaseRecord[]> {
        const collection = MongoDBService.getCollection<PurchaseRecord>('purchase_records');
        return await collection
            .find({ userId })
            .sort({ purchasedAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取热门商品
     */
    static async getHotProducts(limit: number = 5): Promise<ProductConfig[]> {
        // 从DragonflyDB获取热门商品排行
        const hotProductIds = await DragonflyDBService.getLeaderboard('shop:hot_products', 0, limit - 1);

        const products: ProductConfig[] = [];
        for (const item of hotProductIds) {
            const product = this.getProduct(item.userId); // userId在这里实际是productId
            if (product) {
                products.push(product);
            }
        }

        return products;
    }

    /**
     * 记录商品浏览
     */
    static async recordProductView(productId: string): Promise<void> {
        await DragonflyDBService.incrementLeaderboardScore('shop:hot_products', productId, 1);
    }
}
