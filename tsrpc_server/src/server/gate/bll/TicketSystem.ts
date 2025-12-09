import { MongoDBService } from "../db/MongoDBService";
import { ObjectId } from "mongodb";

export enum TicketStatus {
    Open = 'open',           // 待处理
    InProgress = 'progress', // 处理中
    Replied = 'replied',     // 已回复
    Closed = 'closed'        // 已关闭
}

export enum TicketType {
    Bug = 'bug',
    Payment = 'payment',
    Report = 'report',
    Account = 'account',
    Other = 'other'
}

export interface TicketMessage {
    sender: 'user' | 'admin';
    senderId: string;
    senderName: string;
    content: string;
    imageUrl?: string;
    timestamp: number;
}

export interface Ticket {
    ticketId: string;
    userId: string;
    type: TicketType;
    status: TicketStatus;
    subject: string;
    messages: TicketMessage[];
    
    // 元数据
    createdAt: number;
    updatedAt: number;
    closedAt?: number;
    
    // 设备信息
    deviceModel?: string;
    appVersion?: string;
}

export class TicketSystem {
    private static get collection() {
        return MongoDBService.getCollection<Ticket>('support_tickets');
    }

    /**
     * 创建工单
     */
    static async createTicket(params: {
        userId: string;
        type: TicketType;
        subject: string;
        content: string;
        imageUrl?: string;
        deviceModel?: string;
        appVersion?: string;
    }): Promise<string> {
        const ticketId = new ObjectId().toHexString();
        const ticket: Ticket = {
            ticketId,
            userId: params.userId,
            type: params.type,
            status: TicketStatus.Open,
            subject: params.subject,
            messages: [{
                sender: 'user',
                senderId: params.userId,
                senderName: 'User', // 可以从UserDB获取真实昵称
                content: params.content,
                imageUrl: params.imageUrl,
                timestamp: Date.now()
            }],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deviceModel: params.deviceModel,
            appVersion: params.appVersion
        };

        await this.collection.insertOne(ticket);
        return ticketId;
    }

    /**
     * 回复工单
     */
    static async replyTicket(ticketId: string, adminId: string, adminName: string, content: string): Promise<boolean> {
        const message: TicketMessage = {
            sender: 'admin',
            senderId: adminId,
            senderName: adminName,
            content,
            timestamp: Date.now()
        };

        const result = await this.collection.updateOne(
            { ticketId },
            {
                $push: { messages: message },
                $set: { 
                    status: TicketStatus.Replied,
                    updatedAt: Date.now()
                }
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * 更新状态
     */
    static async updateStatus(ticketId: string, status: TicketStatus): Promise<boolean> {
        const update: any = {
            status,
            updatedAt: Date.now()
        };
        
        if (status === TicketStatus.Closed) {
            update.closedAt = Date.now();
        }

        const result = await this.collection.updateOne(
            { ticketId },
            { $set: update }
        );

        return result.modifiedCount > 0;
    }

    /**
     * 获取工单列表 (管理员)
     */
    static async getTickets(query: {
        userId?: string;
        status?: TicketStatus;
        type?: TicketType;
        page?: number;
        limit?: number;
    }): Promise<{ tickets: Ticket[], total: number }> {
        const dbQuery: any = {};
        if (query.userId) dbQuery.userId = query.userId;
        if (query.status) dbQuery.status = query.status;
        if (query.type) dbQuery.type = query.type;

        const total = await this.collection.countDocuments(dbQuery);
        const tickets = await this.collection
            .find(dbQuery)
            .sort({ updatedAt: -1 }) // 最近更新的在前
            .skip(((query.page || 1) - 1) * (query.limit || 20))
            .limit(query.limit || 20)
            .toArray();

        return { tickets, total };
    }

    /**
     * 获取单个工单详情
     */
    static async getTicket(ticketId: string): Promise<Ticket | null> {
        return await this.collection.findOne({ ticketId });
    }
}
