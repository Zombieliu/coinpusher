import { MongoDBService } from "../db/MongoDBService";
import { ObjectId } from "mongodb";

export enum AnnouncementType {
    Notice = 'notice',      // 强弹窗公告
    Scroll = 'scroll',      // 跑马灯公告
    Activity = 'activity'   // 活动公告
}

export interface Announcement {
    announcementId: string;
    type: AnnouncementType;
    title: string;
    content: string; // 支持HTML或富文本
    startTime: number;
    endTime: number;
    priority: number; // 越大越靠前
    platforms?: string[]; // ['ios', 'android', 'web']，空则全平台
    active: boolean;
    
    // 弹窗特有
    imageUrl?: string;
    linkUrl?: string;

    createdAt: number;
    createdBy: string;
    updatedAt?: number;
    updatedBy?: string;
}

export class AnnouncementSystem {
    
    static async createAnnouncement(data: Omit<Announcement, 'announcementId' | 'createdAt'>): Promise<string> {
        const collection = MongoDBService.getCollection<Announcement>('announcements');
        const announcementId = new ObjectId().toHexString();
        
        const announcement: Announcement = {
            ...data,
            announcementId,
            createdAt: Date.now()
        };
        
        await collection.insertOne(announcement);
        return announcementId;
    }

    static async updateAnnouncement(announcementId: string, updates: Partial<Announcement>, operator: string): Promise<boolean> {
        const collection = MongoDBService.getCollection<Announcement>('announcements');
        
        const result = await collection.updateOne(
            { announcementId },
            {
                $set: {
                    ...updates,
                    updatedAt: Date.now(),
                    updatedBy: operator
                }
            }
        );
        
        return result.modifiedCount > 0;
    }

    static async deleteAnnouncement(announcementId: string): Promise<boolean> {
        const collection = MongoDBService.getCollection<Announcement>('announcements');
        const result = await collection.deleteOne({ announcementId });
        return result.deletedCount > 0;
    }

    static async getAnnouncements(query: {
        type?: AnnouncementType;
        active?: boolean;
        platform?: string;
        now?: number; // 如果提供，则只返回有效期内的
        page?: number;
        limit?: number;
    }): Promise<{ list: Announcement[], total: number }> {
        const collection = MongoDBService.getCollection<Announcement>('announcements');
        const dbQuery: any = {};
        
        if (query.type) dbQuery.type = query.type;
        if (query.active !== undefined) dbQuery.active = query.active;
        if (query.platform) dbQuery.platforms = { $in: [query.platform] };
        
        if (query.now) {
            dbQuery.startTime = { $lte: query.now };
            dbQuery.endTime = { $gte: query.now };
        }

        const total = await collection.countDocuments(dbQuery);
        
        let cursor = collection.find(dbQuery).sort({ priority: -1, createdAt: -1 });
        
        if (query.page && query.limit) {
            cursor = cursor.skip((query.page - 1) * query.limit).limit(query.limit);
        }
        
        const list = (await cursor.toArray()).map(item => {
            // Backward compatibility: some legacy announcements may miss `type`
            if (!item.type) {
                return {
                    ...item,
                    type: AnnouncementType.Notice
                };
            }
            return item;
        });

        return { list, total };
    }

    static async getAnnouncementById(announcementId: string): Promise<Announcement | null> {
        const collection = MongoDBService.getCollection<Announcement>('announcements');
        return await collection.findOne({ announcementId });
    }
}
