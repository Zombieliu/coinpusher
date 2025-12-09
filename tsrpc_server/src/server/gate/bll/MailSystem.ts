/**
 * 📧 邮件系统
 *
 * 功能：
 * 1. 系统邮件
 * 2. 奖励邮件
 * 3. 道具发放
 * 4. 公告推送
 * 5. 邮件过期
 * 6. 一键领取
 * 7. 批量发送
 *
 * 邮件类型：
 * - 系统邮件：系统通知
 * - 奖励邮件：包含道具/金币奖励
 * - 活动邮件：活动相关
 * - 管理员邮件：运营发送
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { UserDB } from '../data/UserDB';

/** 邮件类型 */
export enum MailType {
    System = 'system',          // 系统邮件
    Reward = 'reward',          // 奖励邮件
    Activity = 'activity',      // 活动邮件
    Admin = 'admin'             // 管理员邮件
}

/** 邮件状态 */
export enum MailStatus {
    Unread = 'unread',          // 未读
    Read = 'read',              // 已读
    Claimed = 'claimed',        // 已领取
    Expired = 'expired'         // 已过期
}

/** 邮件数据 */
export interface Mail {
    mailId: string;             // 邮件ID
    userId: string;             // 接收者ID（单发），或 "all" 表示全服
    type: MailType;             // 邮件类型
    title: string;              // 标题
    content: string;            // 内容
    sender: string;             // 发件人
    rewards?: MailReward;       // 奖励
    status: MailStatus;         // 状态
    createdAt: number;          // 创建时间
    expiresAt: number;          // 过期时间
    readAt?: number;            // 读取时间
    claimedAt?: number;         // 领取时间
    metadata?: any;             // 额外数据
}

/** 邮件奖励 */
export interface MailReward {
    gold?: number;              // 金币
    tickets?: number;           // 彩票
    items?: Array<{             // 道具
        itemId: string;
        quantity: number;
    }>;
    skins?: string[];           // 皮肤
    exp?: number;               // 经验
}

/** 邮件模板 */
export interface MailTemplate {
    templateId: string;
    type: MailType;
    title: string;
    content: string;
    rewards?: MailReward;
    expiresIn: number;          // 过期时长（毫秒）
}

export class MailSystem {
    /**
     * 默认过期时间（7天）
     */
    private static readonly DEFAULT_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000;

    /**
     * 邮件模板
     */
    private static readonly MAIL_TEMPLATES: Record<string, MailTemplate> = {
        'welcome': {
            templateId: 'welcome',
            type: MailType.System,
            title: '欢迎来到推币机世界！',
            content: '感谢注册，这是新手礼包，祝你游戏愉快！',
            rewards: {
                gold: 1000,
                tickets: 10,
                items: [{ itemId: 'lucky_charm', quantity: 1 }]
            },
            expiresIn: 30 * 24 * 60 * 60 * 1000  // 30天
        },
        'daily_reward': {
            templateId: 'daily_reward',
            type: MailType.Reward,
            title: '每日奖励',
            content: '这是你今天的每日奖励，记得每天登录哦！',
            rewards: {
                gold: 100,
                tickets: 2
            },
            expiresIn: 24 * 60 * 60 * 1000  // 1天
        },
        'maintenance_compensation': {
            templateId: 'maintenance_compensation',
            type: MailType.Admin,
            title: '维护补偿',
            content: '感谢您的耐心等待，这是维护补偿奖励。',
            rewards: {
                gold: 500,
                tickets: 5
            },
            expiresIn: 7 * 24 * 60 * 60 * 1000  // 7天
        }
    };

    /**
     * 发送邮件（单个用户）
     */
    static async sendMail(
        userId: string,
        type: MailType,
        title: string,
        content: string,
        sender: string = 'System',
        rewards?: MailReward,
        expiresIn?: number
    ): Promise<{
        success: boolean;
        mailId?: string;
        error?: string;
    }> {
        try {
            const collection = MongoDBService.getCollection<Mail>('mails');
            const now = Date.now();
            const mailId = `mail_${userId}_${now}_${Math.random().toString(36).substr(2, 9)}`;

            const mail: Mail = {
                mailId,
                userId,
                type,
                title,
                content,
                sender,
                rewards,
                status: MailStatus.Unread,
                createdAt: now,
                expiresAt: now + (expiresIn || this.DEFAULT_EXPIRE_TIME)
            };

            await collection.insertOne(mail);

            // 增加未读邮件计数
            await this.incrementUnreadCount(userId);

            console.log(`[MailSystem] Mail sent to ${userId}: ${mailId}`);

            return {
                success: true,
                mailId
            };
        } catch (error) {
            console.error('[MailSystem] Send mail error:', error);
            return {
                success: false,
                error: '发送邮件失败'
            };
        }
    }

    /**
     * 批量发送邮件（全服或指定用户列表）
     */
    static async sendBatchMail(
        userIds: string[] | 'all',
        type: MailType,
        title: string,
        content: string,
        sender: string = 'System',
        rewards?: MailReward,
        expiresIn?: number
    ): Promise<{
        success: boolean;
        sentCount?: number;
        error?: string;
    }> {
        try {
            const collection = MongoDBService.getCollection<Mail>('mails');
            const now = Date.now();
            const mailId = `batch_${now}_${Math.random().toString(36).substr(2, 9)}`;

            // 如果是全服邮件
            if (userIds === 'all') {
                const mail: Mail = {
                    mailId,
                    userId: 'all',  // 特殊标记
                    type,
                    title,
                    content,
                    sender,
                    rewards,
                    status: MailStatus.Unread,
                    createdAt: now,
                    expiresAt: now + (expiresIn || this.DEFAULT_EXPIRE_TIME)
                };

                await collection.insertOne(mail);

                console.log(`[MailSystem] Batch mail sent to all users: ${mailId}`);

                return {
                    success: true,
                    sentCount: -1  // -1 表示全服
                };
            }

            // 批量插入
            const mails: Mail[] = userIds.map(userId => ({
                mailId: `${mailId}_${userId}`,
                userId,
                type,
                title,
                content,
                sender,
                rewards,
                status: MailStatus.Unread,
                createdAt: now,
                expiresAt: now + (expiresIn || this.DEFAULT_EXPIRE_TIME)
            }));

            await collection.insertMany(mails);

            // 批量增加未读计数
            for (const userId of userIds) {
                await this.incrementUnreadCount(userId);
            }

            console.log(`[MailSystem] Batch mail sent to ${userIds.length} users: ${mailId}`);

            return {
                success: true,
                sentCount: userIds.length
            };
        } catch (error) {
            console.error('[MailSystem] Send batch mail error:', error);
            return {
                success: false,
                error: '批量发送邮件失败'
            };
        }
    }

    /**
     * 使用模板发送邮件
     */
    static async sendMailFromTemplate(
        userId: string,
        templateId: string,
        customData?: { title?: string; content?: string; rewards?: MailReward }
    ): Promise<{
        success: boolean;
        mailId?: string;
        error?: string;
    }> {
        const template = this.MAIL_TEMPLATES[templateId];
        if (!template) {
            return {
                success: false,
                error: `邮件模板 ${templateId} 不存在`
            };
        }

        return this.sendMail(
            userId,
            template.type,
            customData?.title || template.title,
            customData?.content || template.content,
            'System',
            customData?.rewards || template.rewards,
            template.expiresIn
        );
    }

    /**
     * 获取邮件列表 (带分页)
     *
     * @param userId 用户ID
     * @param options 查询选项
     * @returns 邮件列表和分页信息
     */
    static async getMailList(
        userId: string,
        options: {
            status?: MailStatus;
            page?: number;
            pageSize?: number;
            includeExpired?: boolean;
        } = {}
    ): Promise<{
        mails: Mail[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
    }> {
        try {
            const collection = MongoDBService.getCollection<Mail>('mails');
            const now = Date.now();

            // 默认参数
            const page = options.page ?? 1;
            const pageSize = options.pageSize ?? 20;
            const skip = (page - 1) * pageSize;

            // 查询条件：用户ID或全服邮件
            const query: any = {
                $or: [
                    { userId },
                    { userId: 'all' }
                ]
            };

            // 是否包含过期邮件
            if (!options.includeExpired) {
                query.expiresAt = { $gt: now };
            }

            // 按状态过滤
            if (options.status) {
                query.status = options.status;
            }

            // 并行查询总数和当前页数据
            const [mails, total] = await Promise.all([
                collection
                    .find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(pageSize)
                    .toArray(),
                collection.countDocuments(query)
            ]);

            return {
                mails,
                total,
                page,
                pageSize,
                hasMore: skip + mails.length < total
            };
        } catch (error) {
            console.error('[MailSystem] Get mail list error:', error);
            return {
                mails: [],
                total: 0,
                page: options.page ?? 1,
                pageSize: options.pageSize ?? 20,
                hasMore: false
            };
        }
    }

    /**
     * 读取邮件
     */
    static async readMail(userId: string, mailId: string): Promise<{
        success: boolean;
        mail?: Mail;
        error?: string;
    }> {
        try {
            const collection = MongoDBService.getCollection<Mail>('mails');
            const mail = await collection.findOne({ mailId, userId });

            if (!mail) {
                return {
                    success: false,
                    error: '邮件不存在'
                };
            }

            if (mail.status === MailStatus.Unread) {
                await collection.updateOne(
                    { mailId, userId },
                    {
                        $set: {
                            status: MailStatus.Read,
                            readAt: Date.now()
                        }
                    }
                );

                // 减少未读计数
                await this.decrementUnreadCount(userId);

                mail.status = MailStatus.Read;
                mail.readAt = Date.now();
            }

            return {
                success: true,
                mail
            };
        } catch (error) {
            console.error('[MailSystem] Read mail error:', error);
            return {
                success: false,
                error: '读取邮件失败'
            };
        }
    }

    /**
     * 领取邮件奖励
     */
    static async claimMailReward(userId: string, mailId: string): Promise<{
        success: boolean;
        rewards?: MailReward;
        error?: string;
    }> {
        try {
            const collection = MongoDBService.getCollection<Mail>('mails');
            const mail = await collection.findOne({ mailId, userId });

            if (!mail) {
                return {
                    success: false,
                    error: '邮件不存在'
                };
            }

            if (mail.status === MailStatus.Claimed) {
                return {
                    success: false,
                    error: '奖励已领取'
                };
            }

            if (mail.expiresAt < Date.now()) {
                return {
                    success: false,
                    error: '邮件已过期'
                };
            }

            if (!mail.rewards) {
                return {
                    success: false,
                    error: '该邮件没有奖励'
                };
            }

            // 发放奖励
            await this.giveMailReward(userId, mail.rewards);

            // 更新邮件状态
            await collection.updateOne(
                { mailId, userId },
                {
                    $set: {
                        status: MailStatus.Claimed,
                        claimedAt: Date.now()
                    }
                }
            );

            console.log(`[MailSystem] User ${userId} claimed mail ${mailId}`);

            return {
                success: true,
                rewards: mail.rewards
            };
        } catch (error) {
            console.error('[MailSystem] Claim mail reward error:', error);
            return {
                success: false,
                error: '领取奖励失败'
            };
        }
    }

    /**
     * 一键领取所有奖励
     */
    static async claimAllRewards(userId: string): Promise<{
        success: boolean;
        claimedCount?: number;
        totalRewards?: MailReward;
        error?: string;
    }> {
        try {
            const { mails } = await this.getMailList(userId);
            const claimableMails = mails.filter(
                m => m.rewards && m.status !== MailStatus.Claimed && m.expiresAt > Date.now()
            );

            if (claimableMails.length === 0) {
                return {
                    success: false,
                    error: '没有可领取的奖励'
                };
            }

            // 汇总奖励
            const totalRewards: MailReward = {
                gold: 0,
                tickets: 0,
                items: [],
                skins: [],
                exp: 0
            };

            for (const mail of claimableMails) {
                if (mail.rewards) {
                    totalRewards.gold! += mail.rewards.gold || 0;
                    totalRewards.tickets! += mail.rewards.tickets || 0;
                    totalRewards.exp! += mail.rewards.exp || 0;
                    if (mail.rewards.items) totalRewards.items!.push(...mail.rewards.items);
                    if (mail.rewards.skins) totalRewards.skins!.push(...mail.rewards.skins);
                }
            }

            // 发放汇总奖励
            await this.giveMailReward(userId, totalRewards);

            // 批量更新邮件状态
            const collection = MongoDBService.getCollection<Mail>('mails');
            await collection.updateMany(
                {
                    mailId: { $in: claimableMails.map(m => m.mailId) },
                    userId
                },
                {
                    $set: {
                        status: MailStatus.Claimed,
                        claimedAt: Date.now()
                    }
                }
            );

            console.log(`[MailSystem] User ${userId} claimed all rewards, count: ${claimableMails.length}`);

            return {
                success: true,
                claimedCount: claimableMails.length,
                totalRewards
            };
        } catch (error) {
            console.error('[MailSystem] Claim all rewards error:', error);
            return {
                success: false,
                error: '一键领取失败'
            };
        }
    }

    /**
     * 删除邮件
     */
    static async deleteMail(userId: string, mailId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            const collection = MongoDBService.getCollection<Mail>('mails');
            const result = await collection.deleteOne({ mailId, userId });

            if (result.deletedCount === 0) {
                return {
                    success: false,
                    error: '邮件不存在'
                };
            }

            return {
                success: true
            };
        } catch (error) {
            console.error('[MailSystem] Delete mail error:', error);
            return {
                success: false,
                error: '删除邮件失败'
            };
        }
    }

    /**
     * 获取未读邮件数量
     */
    static async getUnreadCount(userId: string): Promise<number> {
        try {
            const cached = await DragonflyDBService.get(`mail:unread:${userId}`);
            if (cached) {
                return parseInt(cached);
            }

            const collection = MongoDBService.getCollection<Mail>('mails');
            const count = await collection.countDocuments({
                $or: [{ userId }, { userId: 'all' }],
                status: MailStatus.Unread,
                expiresAt: { $gt: Date.now() }
            });

            // 缓存
            await DragonflyDBService.set(`mail:unread:${userId}`, count.toString(), 300);

            return count;
        } catch (error) {
            console.error('[MailSystem] Get unread count error:', error);
            return 0;
        }
    }

    /**
     * 清理过期邮件（定时任务）
     */
    static async cleanupExpiredMails(): Promise<number> {
        try {
            const collection = MongoDBService.getCollection<Mail>('mails');
            const now = Date.now();

            const result = await collection.deleteMany({
                expiresAt: { $lt: now }
            });

            console.log(`[MailSystem] Cleaned up ${result.deletedCount} expired mails`);

            return result.deletedCount;
        } catch (error) {
            console.error('[MailSystem] Cleanup expired mails error:', error);
            return 0;
        }
    }

    /**
     * 启动清理定时器
     */
    static startCleanupTimer(): void {
        // 每小时清理一次过期邮件
        setInterval(async () => {
            await this.cleanupExpiredMails();
        }, 60 * 60 * 1000);

        console.log('[MailSystem] Cleanup timer started');
    }

    /**
     * 发放邮件奖励
     */
    private static async giveMailReward(userId: string, rewards: MailReward): Promise<void> {
        // 发放金币
        if (rewards.gold && rewards.gold > 0) {
            await UserDB.addGold(userId, rewards.gold);
        }

        // 发放彩票
        if (rewards.tickets && rewards.tickets > 0) {
            await UserDB.addTickets(userId, rewards.tickets);
        }

        // 发放经验
        if (rewards.exp && rewards.exp > 0) {
            const { LevelSystem, ExpSource } = await import('./LevelSystem');
            await LevelSystem.addExp(userId, rewards.exp, ExpSource.Admin);
        }

        // 发放道具
        if (rewards.items && rewards.items.length > 0) {
            const { ItemSystem } = await import('./ItemSystem');
            for (const item of rewards.items) {
                await ItemSystem.addItem(userId, item.itemId, item.quantity);
            }
        }

        // 发放皮肤
        if (rewards.skins && rewards.skins.length > 0) {
            const { SkinSystem } = await import('./SkinSystem');
            for (const skinId of rewards.skins) {
                await SkinSystem.unlockSkin(userId, skinId);
            }
        }
    }

    /**
     * 增加未读计数
     */
    private static async incrementUnreadCount(userId: string): Promise<void> {
        try {
            await DragonflyDBService.incr(`mail:unread:${userId}`);
            await DragonflyDBService.expire(`mail:unread:${userId}`, 300);
        } catch (error) {
            console.error('[MailSystem] Increment unread count error:', error);
        }
    }

    /**
     * 减少未读计数
     */
    private static async decrementUnreadCount(userId: string): Promise<void> {
        try {
            const current = await DragonflyDBService.get(`mail:unread:${userId}`);
            if (current && parseInt(current) > 0) {
                await DragonflyDBService.decr(`mail:unread:${userId}`);
            }
        } catch (error) {
            console.error('[MailSystem] Decrement unread count error:', error);
        }
    }
}
