/**
 * 🏰 公会系统
 *
 * 功能：
 * 1. 创建/解散公会
 * 2. 加入/退出公会
 * 3. 公会等级/经验
 * 4. 公会职位（会长/副会长/成员）
 * 5. 公会福利（经验加成/商店折扣）
 * 6. 公会活动（公会战/公会副本）
 * 7. 公会捐献
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';

/** 公会职位 */
export enum GuildRole {
    Leader = 'leader',         // 会长
    Officer = 'officer',       // 副会长
    Member = 'member'          // 成员
}

/** 公会成员 */
export interface GuildMember {
    userId: string;
    username: string;
    role: GuildRole;
    joinedAt: number;
    contribution: number;      // 贡献度
    lastActive: number;        // 最后活跃时间
}

/** 公会数据 */
export interface GuildData {
    guildId: string;
    name: string;
    tag: string;               // 公会标签（2-4字符）
    description: string;
    level: number;             // 公会等级
    exp: number;               // 公会经验
    expToNext: number;         // 升级所需经验
    members: GuildMember[];
    maxMembers: number;        // 最大成员数
    createdAt: number;
    createdBy: string;
    funds: number;             // 公会资金
    settings: GuildSettings;
}

/** 公会设置 */
export interface GuildSettings {
    autoAccept: boolean;       // 自动接受申请
    minLevel: number;          // 最低等级要求
    announcement: string;      // 公会公告
}

/** 公会申请 */
export interface GuildApplication {
    applicationId: string;
    userId: string;
    username: string;
    guildId: string;
    message?: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: number;
}

/** 公会福利 */
export interface GuildBenefits {
    expBonus: number;          // 经验加成（%）
    goldBonus: number;         // 金币加成（%）
    shopDiscount: number;      // 商店折扣（%）
}

export class GuildSystem {
    private static readonly MAX_GUILDS = 10000;
    private static readonly CREATE_COST = 5000;              // 创建公会费用
    private static readonly BASE_MAX_MEMBERS = 30;           // 基础成员上限
    private static readonly MAX_OFFICERS = 5;                // 最大副会长数

    /**
     * 公会等级经验曲线
     */
    private static readonly EXP_CURVE = [
        1000,   // L1 -> L2
        2000,   // L2 -> L3
        3000,   // L3 -> L4
        4000,   // L4 -> L5
        5000,   // L5+  按公式计算
    ];

    /**
     * 创建公会
     */
    static async createGuild(
        userId: string,
        name: string,
        tag: string,
        description: string = ''
    ): Promise<{
        success: boolean;
        error?: string;
        guildId?: string;
    }> {
        // 验证参数
        if (name.length < 2 || name.length > 20) {
            return { success: false, error: '公会名称长度必须在2-20字符之间' };
        }

        if (tag.length < 2 || tag.length > 4) {
            return { success: false, error: '公会标签长度必须在2-4字符之间' };
        }

        // 检查是否已加入公会
        const userGuild = await this.getUserGuild(userId);
        if (userGuild) {
            return { success: false, error: '已加入公会' };
        }

        // 检查金币
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (user.gold < this.CREATE_COST) {
            return { success: false, error: `金币不足，需要 ${this.CREATE_COST} 金币` };
        }

        // 检查公会名称是否重复
        const collection = MongoDBService.getCollection<GuildData>('guilds');
        const existingName = await collection.findOne({ name });
        if (existingName) {
            return { success: false, error: '公会名称已存在' };
        }

        // 检查公会标签是否重复
        const existingTag = await collection.findOne({ tag });
        if (existingTag) {
            return { success: false, error: '公会标签已存在' };
        }

        // 扣除金币
        await UserDB.updateUser(userId, {
            gold: user.gold - this.CREATE_COST
        });

        // 创建公会
        const guildId = `guild_${Date.now()}_${userId}`;
        const now = Date.now();

        const guildData: GuildData = {
            guildId,
            name,
            tag,
            description,
            level: 1,
            exp: 0,
            expToNext: this.getExpForLevel(1),
            members: [{
                userId,
                username: user.username,
                role: GuildRole.Leader,
                joinedAt: now,
                contribution: 0,
                lastActive: now
            }],
            maxMembers: this.BASE_MAX_MEMBERS,
            createdAt: now,
            createdBy: userId,
            funds: 0,
            settings: {
                autoAccept: false,
                minLevel: 1,
                announcement: '欢迎加入公会！'
            }
        };

        await collection.insertOne(guildData);

        console.log(`[GuildSystem] 用户 ${userId} 创建了公会 ${name}`);

        return { success: true, guildId };
    }

    /**
     * 申请加入公会
     */
    static async applyToGuild(
        userId: string,
        guildId: string,
        message?: string
    ): Promise<{
        success: boolean;
        error?: string;
        applicationId?: string;
    }> {
        // 检查是否已加入公会
        const userGuild = await this.getUserGuild(userId);
        if (userGuild) {
            return { success: false, error: '已加入公会' };
        }

        // 获取公会数据
        const guild = await this.getGuild(guildId);
        if (!guild) {
            return { success: false, error: '公会不存在' };
        }

        // 检查成员上限
        if (guild.members.length >= guild.maxMembers) {
            return { success: false, error: '公会人数已满' };
        }

        // 获取用户信息
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        // 检查等级要求
        if (guild.settings.minLevel && guild.settings.minLevel > 0) {
            const { LevelSystem } = await import('./LevelSystem');
            const levelData = await LevelSystem.getUserLevel(userId);
            if (levelData.level < guild.settings.minLevel) {
                return { success: false, error: `需要等级${guild.settings.minLevel}才能加入公会` };
            }
        }

        // 如果自动接受，直接加入
        if (guild.settings.autoAccept) {
            return await this.acceptGuildApplication(guildId, userId);
        }

        // 创建申请
        const applicationId = `app_${Date.now()}_${userId}_${guildId}`;
        const application: GuildApplication = {
            applicationId,
            userId,
            username: user.username,
            guildId,
            message,
            status: 'pending',
            createdAt: Date.now()
        };

        const collection = MongoDBService.getCollection('guild_applications');
        await collection.insertOne(application);

        console.log(`[GuildSystem] 用户 ${userId} 申请加入公会 ${guildId}`);

        return { success: true, applicationId };
    }

    /**
     * 接受公会申请
     */
    static async acceptGuildApplication(
        guildId: string,
        userId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const guild = await this.getGuild(guildId);
        if (!guild) {
            return { success: false, error: '公会不存在' };
        }

        // 检查成员上限
        if (guild.members.length >= guild.maxMembers) {
            return { success: false, error: '公会人数已满' };
        }

        // 获取用户信息
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        // 添加成员
        const now = Date.now();
        guild.members.push({
            userId,
            username: user.username,
            role: GuildRole.Member,
            joinedAt: now,
            contribution: 0,
            lastActive: now
        });

        await this.updateGuild(guildId, guild);

        console.log(`[GuildSystem] 用户 ${userId} 加入了公会 ${guildId}`);

        return { success: true };
    }

    /**
     * 退出公会
     */
    static async leaveGuild(userId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const guild = await this.getUserGuild(userId);
        if (!guild) {
            return { success: false, error: '未加入公会' };
        }

        const member = guild.members.find(m => m.userId === userId);
        if (!member) {
            return { success: false, error: '不在公会中' };
        }

        // 会长不能直接退出
        if (member.role === GuildRole.Leader) {
            return { success: false, error: '会长需要先转让会长职位或解散公会' };
        }

        // 移除成员
        guild.members = guild.members.filter(m => m.userId !== userId);

        await this.updateGuild(guild.guildId, guild);

        console.log(`[GuildSystem] 用户 ${userId} 退出了公会 ${guild.guildId}`);

        return { success: true };
    }

    /**
     * 踢出成员
     */
    static async kickMember(
        operatorId: string,
        targetUserId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const guild = await this.getUserGuild(operatorId);
        if (!guild) {
            return { success: false, error: '未加入公会' };
        }

        const operator = guild.members.find(m => m.userId === operatorId);
        if (!operator || operator.role === GuildRole.Member) {
            return { success: false, error: '权限不足' };
        }

        const target = guild.members.find(m => m.userId === targetUserId);
        if (!target) {
            return { success: false, error: '目标用户不在公会中' };
        }

        // 不能踢会长
        if (target.role === GuildRole.Leader) {
            return { success: false, error: '不能踢出会长' };
        }

        // 副会长只能踢普通成员
        if (operator.role === GuildRole.Officer && target.role === GuildRole.Officer) {
            return { success: false, error: '副会长不能踢出副会长' };
        }

        // 移除成员
        guild.members = guild.members.filter(m => m.userId !== targetUserId);

        await this.updateGuild(guild.guildId, guild);

        console.log(`[GuildSystem] ${operatorId} 踢出了成员 ${targetUserId}`);

        return { success: true };
    }

    /**
     * 转让会长
     */
    static async transferLeadership(
        currentLeaderId: string,
        newLeaderId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const guild = await this.getUserGuild(currentLeaderId);
        if (!guild) {
            return { success: false, error: '未加入公会' };
        }

        const currentLeader = guild.members.find(m => m.userId === currentLeaderId);
        if (!currentLeader || currentLeader.role !== GuildRole.Leader) {
            return { success: false, error: '只有会长可以转让' };
        }

        const newLeader = guild.members.find(m => m.userId === newLeaderId);
        if (!newLeader) {
            return { success: false, error: '目标用户不在公会中' };
        }

        // 转让职位
        currentLeader.role = GuildRole.Officer;
        newLeader.role = GuildRole.Leader;

        await this.updateGuild(guild.guildId, guild);

        console.log(`[GuildSystem] ${currentLeaderId} 将会长转让给 ${newLeaderId}`);

        return { success: true };
    }

    /**
     * 设置职位
     */
    static async setMemberRole(
        operatorId: string,
        targetUserId: string,
        newRole: GuildRole
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        if (newRole === GuildRole.Leader) {
            return { success: false, error: '请使用转让功能' };
        }

        const guild = await this.getUserGuild(operatorId);
        if (!guild) {
            return { success: false, error: '未加入公会' };
        }

        const operator = guild.members.find(m => m.userId === operatorId);
        if (!operator || operator.role !== GuildRole.Leader) {
            return { success: false, error: '只有会长可以设置职位' };
        }

        const target = guild.members.find(m => m.userId === targetUserId);
        if (!target) {
            return { success: false, error: '目标用户不在公会中' };
        }

        // 检查副会长数量
        if (newRole === GuildRole.Officer) {
            const officerCount = guild.members.filter(m => m.role === GuildRole.Officer).length;
            if (officerCount >= this.MAX_OFFICERS) {
                return { success: false, error: `副会长数量已达上限（${this.MAX_OFFICERS}）` };
            }
        }

        target.role = newRole;

        await this.updateGuild(guild.guildId, guild);

        console.log(`[GuildSystem] ${operatorId} 将 ${targetUserId} 的职位设置为 ${newRole}`);

        return { success: true };
    }

    /**
     * 公会捐献
     */
    static async donate(
        userId: string,
        amount: number
    ): Promise<{
        success: boolean;
        error?: string;
        contribution?: number;
        guildExp?: number;
    }> {
        const guild = await this.getUserGuild(userId);
        if (!guild) {
            return { success: false, error: '未加入公会' };
        }

        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        if (user.gold < amount) {
            return { success: false, error: '金币不足' };
        }

        // 扣除金币
        await UserDB.updateUser(userId, {
            gold: user.gold - amount
        });

        // 增加公会资金
        guild.funds += amount;

        // 增加个人贡献度
        const member = guild.members.find(m => m.userId === userId);
        if (member) {
            member.contribution += amount;
        }

        // 增加公会经验（捐献1金币 = 1经验）
        const guildExp = amount;
        await this.addGuildExp(guild, guildExp);

        console.log(`[GuildSystem] ${userId} 向公会捐献 ${amount} 金币`);

        return {
            success: true,
            contribution: member?.contribution,
            guildExp
        };
    }

    /**
     * 增加公会经验
     */
    private static async addGuildExp(guild: GuildData, exp: number): Promise<void> {
        guild.exp += exp;

        // 检查升级
        while (guild.exp >= guild.expToNext && guild.level < 100) {
            guild.exp -= guild.expToNext;
            guild.level++;
            guild.expToNext = this.getExpForLevel(guild.level);

            // 提升成员上限
            guild.maxMembers = this.BASE_MAX_MEMBERS + guild.level * 2;

            console.log(`[GuildSystem] 🎉 公会 ${guild.name} 升级到 Level ${guild.level}！`);
        }

        await this.updateGuild(guild.guildId, guild);
    }

    /**
     * 获取公会等级所需经验
     */
    private static getExpForLevel(level: number): number {
        if (level <= 0) return 0;
        if (level >= 100) return 999999;

        if (level <= this.EXP_CURVE.length) {
            return this.EXP_CURVE[level - 1];
        }

        return 5000 + (level - 5) * 1000;
    }

    /**
     * 获取公会福利
     */
    static getGuildBenefits(guildLevel: number): GuildBenefits {
        return {
            expBonus: guildLevel * 2,      // 每级+2% 经验
            goldBonus: guildLevel * 1,     // 每级+1% 金币
            shopDiscount: Math.min(guildLevel * 0.5, 20) // 每级+0.5% 折扣，最高20%
        };
    }

    /**
     * 获取公会
     */
    static async getGuild(guildId: string): Promise<GuildData | null> {
        const collection = MongoDBService.getCollection<GuildData>('guilds');
        return await collection.findOne({ guildId });
    }

    /**
     * 获取用户所在公会
     */
    static async getUserGuild(userId: string): Promise<GuildData | null> {
        const collection = MongoDBService.getCollection<GuildData>('guilds');
        return await collection.findOne({ 'members.userId': userId });
    }

    /**
     * 更新公会数据
     */
    private static async updateGuild(guildId: string, guild: GuildData): Promise<void> {
        const collection = MongoDBService.getCollection<GuildData>('guilds');
        await collection.updateOne(
            { guildId },
            { $set: guild }
        );
    }

    /**
     * 获取公会排行榜
     */
    static async getGuildLeaderboard(limit: number = 100): Promise<GuildData[]> {
        const collection = MongoDBService.getCollection<GuildData>('guilds');
        return await collection
            .find()
            .sort({ level: -1, exp: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 搜索公会
     */
    static async searchGuilds(keyword: string, limit: number = 20): Promise<GuildData[]> {
        const collection = MongoDBService.getCollection<GuildData>('guilds');
        return await collection
            .find({
                $or: [
                    { name: { $regex: keyword, $options: 'i' } },
                    { tag: { $regex: keyword, $options: 'i' } }
                ]
            })
            .limit(limit)
            .toArray();
    }
}
