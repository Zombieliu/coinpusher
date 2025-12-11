import { randomUUID } from "crypto";
import { MongoDBService } from "../db/MongoDBService";

export type CdkAdminActionType = 'generate' | 'disable_code' | 'disable_batch' | 'export';

export interface CdkAdminActionLog {
    actionId: string;
    action: CdkAdminActionType;
    batchId: string;
    code?: string;
    adminId: string;
    adminName: string;
    comment?: string;
    payload?: { [key: string]: any };
    createdAt: number;
}

export class CdkAdminSystem {
    private static readonly COLLECTION = 'cdk_admin_logs';

    static async logAction(params: {
        action: CdkAdminActionType;
        batchId: string;
        code?: string;
        adminId: string;
        adminName: string;
        comment?: string;
        payload?: { [key: string]: any };
    }): Promise<void> {
        const collection = MongoDBService.getCollection<CdkAdminActionLog>(this.COLLECTION);
        await collection.insertOne({
            actionId: randomUUID(),
            createdAt: Date.now(),
            ...params
        });
    }

    static async getActionLogs(params: {
        batchId?: string;
        code?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        list: CdkAdminActionLog[];
        total: number;
        page: number;
        pageSize: number;
    }> {
        const page = params.page ?? 1;
        const limit = params.limit ?? 20;
        const collection = MongoDBService.getCollection<CdkAdminActionLog>(this.COLLECTION);
        const query: any = {};

        if (params.batchId) {
            query.batchId = params.batchId;
        }
        if (params.code) {
            query.code = params.code;
        }

        const total = await collection.countDocuments(query);
        const list = await collection
            .find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        return { list, total, page, pageSize: limit };
    }
}
