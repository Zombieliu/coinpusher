import { MongoDBService } from "../db/MongoDBService";
import type { InviteRelation, InviteStats } from "./InviteSystem";
import { InviteConfigSystem } from "./InviteConfigSystem";
import { Sort } from "mongodb";

export type InviteLeaderboardSort = 'invites' | 'rewards';

export interface InviteLeaderboardEntry {
    userId: string;
    inviteCode: string;
    inviteLink: string;
    totalInvites: number;
    validInvites: number;
    totalRewards: number;
    rank: number;
}

export class InviteAdminSystem {
    static async getLeaderboard(params: {
        page?: number;
        limit?: number;
        sortBy?: InviteLeaderboardSort;
        search?: string;
    }): Promise<{
        list: InviteLeaderboardEntry[];
        total: number;
        page: number;
        pageSize: number;
        summary: {
            totalInvites: number;
            totalRewards: number;
            totalInviters: number;
            todaysNewInvites: number;
        };
        configVersion: number;
    }> {
        const page = params.page ?? 1;
        const limit = params.limit ?? 20;
        const sortBy = params.sortBy ?? 'invites';
        const collection = MongoDBService.getCollection<InviteStats>('invite_stats');
        const filter: any = {};

        if (params.search) {
            const regex = new RegExp(params.search.trim(), 'i');
            filter.$or = [
                { userId: regex },
                { inviteCode: regex }
            ];
        }

        const sort: Sort = sortBy === 'rewards'
            ? { totalRewards: -1, totalInvites: -1 }
            : { totalInvites: -1, totalRewards: -1 };

        const total = await collection.countDocuments(filter);
        const docs = await collection
            .find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        const list = docs.map((doc, index) => ({
            userId: doc.userId,
            inviteCode: doc.inviteCode,
            inviteLink: doc.inviteLink,
            totalInvites: doc.totalInvites,
            validInvites: doc.validInvites ?? doc.totalInvites,
            totalRewards: doc.totalRewards,
            rank: (page - 1) * limit + index + 1
        }));

        const summary = await this.getSummary();
        const configRecord = await InviteConfigSystem.getActiveConfig();

        return {
            list,
            total,
            page,
            pageSize: limit,
            summary,
            configVersion: configRecord.version
        };
    }

    static async exportLeaderboard(params: {
        limit?: number;
        sortBy?: InviteLeaderboardSort;
        search?: string;
    }): Promise<{
        fileName: string;
        csvBase64: string;
        generatedAt: number;
        total: number;
    }> {
        const limit = params.limit ?? 500;
        const { list, total } = await this.getLeaderboard({
            page: 1,
            limit,
            sortBy: params.sortBy,
            search: params.search
        });

        const rows = [
            ['Rank', 'User ID', 'Invite Code', 'Total Invites', 'Valid Invites', 'Total Rewards', 'Invite Link'],
            ...list.map(entry => [
                entry.rank,
                entry.userId,
                entry.inviteCode,
                entry.totalInvites,
                entry.validInvites,
                entry.totalRewards,
                entry.inviteLink
            ])
        ];

        const csv = rows.map(row => row.map(v => this.escapeCsv(v)).join(',')).join('\n');

        return {
            fileName: `invite_leaderboard_${Date.now()}.csv`,
            csvBase64: Buffer.from(csv, 'utf8').toString('base64'),
            generatedAt: Date.now(),
            total
        };
    }

    private static async getSummary() {
        const statsCollection = MongoDBService.getCollection<InviteStats>('invite_stats');
        const [agg] = await statsCollection.aggregate([
            {
                $group: {
                    _id: null,
                    totalInvites: { $sum: '$totalInvites' },
                    totalRewards: { $sum: '$totalRewards' },
                    totalInviters: { $sum: 1 }
                }
            }
        ]).toArray();

        const relationCollection = MongoDBService.getCollection<InviteRelation>('invite_relations');
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todaysNewInvites = await relationCollection.countDocuments({
            invitedAt: { $gte: startOfDay.getTime() }
        });

        return {
            totalInvites: agg?.totalInvites || 0,
            totalRewards: agg?.totalRewards || 0,
            totalInviters: agg?.totalInviters || 0,
            todaysNewInvites
        };
    }

    private static escapeCsv(value: string | number): string {
        const str = value === undefined || value === null ? '' : String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
}
