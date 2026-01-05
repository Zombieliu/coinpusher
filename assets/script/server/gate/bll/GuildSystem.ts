export interface GuildMember {
    userId: string;
    role?: string;
    joinAt?: number;
}

export interface GuildBenefits {
    bonusGold?: number;
    bonusTickets?: number;
    dailyGift?: number;
}

export interface GuildData {
    guildId: string;
    name: string;
    ownerId?: string;
    members?: GuildMember[];
    benefits?: GuildBenefits;
    createdAt?: number;
}
