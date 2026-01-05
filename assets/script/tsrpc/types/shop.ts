/**
 * Front-end copy of shop types used by TSRPC protocols.
 */
export enum ProductType {
    Item = 'item',
    BattlePass = 'battle_pass',
    GoldPack = 'gold_pack',
    TicketPack = 'ticket_pack',
    VIP = 'vip',
    Skin = 'skin'
}

export enum CurrencyType {
    Gold = 'gold',
    RMB = 'rmb',
    USD = 'usd'
}

export enum ProductStatus {
    Available = 'available',
    SoldOut = 'sold_out',
    ComingSoon = 'coming_soon',
    Disabled = 'disabled'
}

export interface ProductContent {
    items?: Array<{ itemId: string; quantity: number }>;
    goldAmount?: number;
    bonusGold?: number;
    ticketAmount?: number;
    bonusTickets?: number;
    vipLevel?: number;
    vipDays?: number;
    vipDuration?: number;
    seasonId?: string;
    skinId?: string;
    skins?: string[];
}

export interface ProductConfig {
    productId: string;
    type: ProductType;
    name: string;
    description: string;
    icon?: string;
    status: ProductStatus;
    price: number;
    currency: CurrencyType;
    originalPrice?: number;
    discount?: number;
    content: ProductContent;
    dailyLimit?: number;
    totalLimit?: number;
    levelRequirement?: number;
    vipRequirement?: number;
    startTime?: number;
    endTime?: number;
    tags: string[];
    category: string;
    sortOrder: number;
}
