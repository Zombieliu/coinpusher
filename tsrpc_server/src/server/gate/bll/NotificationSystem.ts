/**
 * 实时通知系统
 * 使用内存队列存储最近的通知，供SSE推送
 */

export enum NotificationType {
    UserBanned = 'user_banned',
    UserUnbanned = 'user_unbanned',
    MailSent = 'mail_sent',
    ConfigUpdated = 'config_updated',
    EventCreated = 'event_created',
    EventUpdated = 'event_updated',
    EventDeleted = 'event_deleted',
    RewardGranted = 'reward_granted',
    SystemAlert = 'system_alert',
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
    timestamp: number;
    adminId?: string;
    adminName?: string;
}

export class NotificationSystem {
    private static notifications: Notification[] = [];
    private static maxNotifications = 100; // 最多保存100条通知
    private static listeners: Map<string, (notification: Notification) => void> = new Map();

    /**
     * 发送通知
     */
    static sendNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
        const fullNotification: Notification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
        };

        // 添加到队列
        this.notifications.unshift(fullNotification);

        // 限制队列长度
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        // 通知所有监听者
        this.listeners.forEach(listener => {
            try {
                listener(fullNotification);
            } catch (error) {
                console.error('[NotificationSystem] Error in listener:', error);
            }
        });

        console.log(`[NotificationSystem] Notification sent: ${notification.type} - ${notification.title}`);
    }

    /**
     * 获取最近的通知
     */
    static getRecentNotifications(limit: number = 50): Notification[] {
        return this.notifications.slice(0, limit);
    }

    /**
     * 添加监听者（用于SSE）
     */
    static addListener(id: string, callback: (notification: Notification) => void): void {
        this.listeners.set(id, callback);
        console.log(`[NotificationSystem] Listener added: ${id}, total: ${this.listeners.size}`);
    }

    /**
     * 移除监听者
     */
    static removeListener(id: string): void {
        this.listeners.delete(id);
        console.log(`[NotificationSystem] Listener removed: ${id}, remaining: ${this.listeners.size}`);
    }

    /**
     * 获取监听者数量
     */
    static getListenerCount(): number {
        return this.listeners.size;
    }

    /**
     * 清除旧通知
     */
    static clearOldNotifications(olderThan: number): void {
        const before = this.notifications.length;
        this.notifications = this.notifications.filter(n => n.timestamp >= olderThan);
        const removed = before - this.notifications.length;
        if (removed > 0) {
            console.log(`[NotificationSystem] Cleared ${removed} old notifications`);
        }
    }

    /**
     * 发送用户封禁通知
     */
    static notifyUserBanned(userId: string, reason: string, adminName: string): void {
        this.sendNotification({
            type: NotificationType.UserBanned,
            title: '用户被封禁',
            message: `用户 ${userId} 已被封禁，原因: ${reason}`,
            data: { userId, reason },
            adminName,
        });
    }

    /**
     * 发送用户解封通知
     */
    static notifyUserUnbanned(userId: string, adminName: string): void {
        this.sendNotification({
            type: NotificationType.UserUnbanned,
            title: '用户已解封',
            message: `用户 ${userId} 已恢复正常状态`,
            data: { userId },
            adminName,
        });
    }

    /**
     * 发送邮件发送通知
     */
    static notifyMailSent(type: string, count: number, adminName: string): void {
        const typeNames: Record<string, string> = {
            single: '单人',
            batch: '批量',
            broadcast: '全服',
        };
        this.sendNotification({
            type: NotificationType.MailSent,
            title: '邮件已发送',
            message: `${typeNames[type] || type}邮件已发送给 ${count} 个用户`,
            data: { type, count },
            adminName,
        });
    }

    /**
     * 发送配置更新通知
     */
    static notifyConfigUpdated(configType: string, version: number, adminName: string): void {
        this.sendNotification({
            type: NotificationType.ConfigUpdated,
            title: '配置已更新',
            message: `${configType} 配置已更新到版本 ${version}`,
            data: { configType, version },
            adminName,
        });
    }

    /**
     * 发送活动创建通知
     */
    static notifyEventCreated(eventTitle: string, eventType: string, adminName: string): void {
        this.sendNotification({
            type: NotificationType.EventCreated,
            title: '活动已创建',
            message: `新活动"${eventTitle}"已创建 (${eventType})`,
            data: { eventTitle, eventType },
            adminName,
        });
    }

    /**
     * 发送奖励发放通知
     */
    static notifyRewardGranted(userId: string, rewards: any, adminName: string): void {
        const rewardDesc = Object.keys(rewards)
            .filter(k => rewards[k])
            .map(k => `${k}: ${JSON.stringify(rewards[k])}`)
            .join(', ');

        this.sendNotification({
            type: NotificationType.RewardGranted,
            title: '奖励已发放',
            message: `已向用户 ${userId} 发放奖励: ${rewardDesc}`,
            data: { userId, rewards },
            adminName,
        });
    }

    /**
     * 发送系统告警
     */
    static sendSystemAlert(message: string, data?: any): void {
        this.sendNotification({
            type: NotificationType.SystemAlert,
            title: '系统告警',
            message,
            data,
        });
    }
}

// 定期清理旧通知（保留最近1小时的）
setInterval(() => {
    NotificationSystem.clearOldNotifications(Date.now() - 60 * 60 * 1000);
}, 5 * 60 * 1000); // 每5分钟清理一次
