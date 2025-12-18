import { MongoDBService } from "../db/MongoDBService";
import { ObjectId } from "mongodb";
import { AnnouncementSystem } from "./AnnouncementSystem";
import fetch from "node-fetch";

type JobStatus = 'pending' | 'running' | 'done' | 'failed';
type JobType = 'announcement' | 'reward' | 'webhook';

export interface JobLogEntry {
    result: 'success' | 'failed';
    message?: string;
    executedAt: number;
    duration?: number;
    attempt: number;
    httpStatus?: number;
    url?: string;
    method?: string;
    requestBodyPreview?: string;
    responseBodyPreview?: string;
    details?: Record<string, any>;
}

export interface ScheduledJob {
    _id?: any;
    jobId: string;
    type: JobType;
    runAt: number;
    payload: any;
    note?: string;
    createdBy?: string;
    status: JobStatus;
    lastError?: string;
    executedAt?: number;
    createdAt: number;
    logs?: JobLogEntry[];
    retryCount?: number;
    maxRetries?: number;
    retryDelay?: number;
}

type JobExecuteResult = {
    logMeta?: Partial<JobLogEntry>;
};

type JobError = Error & {
    logMeta?: Partial<JobLogEntry>;
};

export class ScheduledJobSystem {
    private static timer: NodeJS.Timer | null = null;
    private static running = false;

    private static readonly MAX_LOGS = 10;

    static async schedule(job: Omit<ScheduledJob, 'jobId' | 'status' | 'createdAt'>): Promise<string> {
        const col = MongoDBService.getCollection<ScheduledJob>('scheduled_jobs');
        const jobId = new ObjectId().toHexString();
        const defaultMaxRetries = job.type === 'webhook' ? 3 : 0;
        await col.insertOne({
            ...job,
            jobId,
            status: 'pending',
            createdAt: Date.now(),
            retryCount: job.retryCount ?? 0,
            maxRetries: job.maxRetries ?? defaultMaxRetries,
            retryDelay: job.retryDelay ?? 60_000,
            logs: job.logs ?? []
        });
        return jobId;
    }

    static async list(status?: JobStatus): Promise<ScheduledJob[]> {
        const col = MongoDBService.getCollection<ScheduledJob>('scheduled_jobs');
        const q: any = {};
        if (status) q.status = status;
        return col.find(q).sort({ runAt: 1 }).toArray();
    }

    static async delete(jobId: string) {
        const col = MongoDBService.getCollection<ScheduledJob>('scheduled_jobs');
        const res = await col.deleteOne({ jobId, status: 'pending' });
        return res.deletedCount && res.deletedCount > 0;
    }

    static start() {
        if (this.timer) return;
        this.timer = setInterval(() => this.tick().catch(console.error), 30_000);
    }

    static async tick() {
        if (this.running) return;
        this.running = true;
        try {
            const now = Date.now();
            const col = MongoDBService.getCollection<ScheduledJob>('scheduled_jobs');
            const job = await col.findOneAndUpdate(
                { status: 'pending', runAt: { $lte: now } },
                { $set: { status: 'running' } },
                { sort: { runAt: 1 } }
            );
            if (!job.value) return;
            const j = job.value;
            const attemptStart = Date.now();
            try {
                const { logMeta } = await this.execute(j);
                const executedAt = Date.now();
                await col.updateOne({ jobId: j.jobId }, {
                    $set: { status: 'done', executedAt, lastError: undefined },
                    $push: {
                        logs: {
                            $each: [{
                                result: 'success',
                                executedAt,
                                duration: executedAt - attemptStart,
                                attempt: (j.retryCount ?? 0) + 1,
                                ...(logMeta || {})
                            }],
                            $position: 0,
                            $slice: this.MAX_LOGS
                        }
                    }
                });
            } catch (err: JobError) {
                const executedAt = Date.now();
                const message = err?.message || String(err);
                const currentRetry = j.retryCount ?? 0;
                const maxRetries = j.maxRetries ?? 0;
                const shouldRetry = currentRetry < maxRetries;
                const logEntry = {
                    result: 'failed' as const,
                    message,
                    executedAt,
                    duration: executedAt - attemptStart,
                    attempt: currentRetry + 1,
                    ...(err?.logMeta || {})
                };
                if (shouldRetry) {
                    const nextRun = executedAt + (j.retryDelay ?? 60_000);
                    await col.updateOne({ jobId: j.jobId }, {
                        $set: { status: 'pending', runAt: nextRun, lastError: message },
                        $inc: { retryCount: 1 },
                        $push: {
                            logs: {
                                $each: [logEntry],
                                $position: 0,
                                $slice: this.MAX_LOGS
                            }
                        }
                    });
                } else {
                    await col.updateOne({ jobId: j.jobId }, {
                        $set: { status: 'failed', lastError: message, executedAt },
                        $push: {
                            logs: {
                                $each: [logEntry],
                                $position: 0,
                                $slice: this.MAX_LOGS
                            }
                        }
                    });
                }
            }
        } finally {
            this.running = false;
        }
    }

    private static async execute(job: ScheduledJob): Promise<JobExecuteResult> {
        switch (job.type) {
            case 'announcement':
                return this.runAnnouncementJob(job);
            case 'reward':
                return this.runRewardJob(job.payload);
            case 'webhook':
                return this.runWebhookJob(job.payload);
            default:
                throw new Error('unknown_job_type');
        }
    }

    private static async runAnnouncementJob(job: ScheduledJob): Promise<JobExecuteResult> {
        const details = {
            title: job.payload?.title,
            type: job.payload?.type,
            startTime: job.payload?.startTime,
            endTime: job.payload?.endTime
        };
        try {
            await AnnouncementSystem.createAnnouncement({
                ...job.payload,
                active: true,
                createdBy: job.createdBy || 'scheduler'
            });
            return { logMeta: { details } };
        } catch (err) {
            (err as JobError).logMeta = { details };
            throw err;
        }
    }

    private static async runRewardJob(payload: any): Promise<JobExecuteResult> {
        const { userId, rewards, reason } = payload;
        if (!userId || !rewards) {
            throw new Error('invalid_reward_payload');
        }

        // 奖励发放逻辑与 ApiGrantReward 一致，但在调度器内部运行，无需管理员权限校验
        const { UserDB } = await import('../data/UserDB');
        const { LevelSystem, ExpSource } = await import('../bll/LevelSystem');
        const { ItemSystem } = await import('../bll/ItemSystem');
        const { SkinSystem } = await import('../bll/SkinSystem');
        const { VIPSystem } = await import('../bll/VIPSystem');

        const user = await UserDB.getUserById(userId);
        if (!user) {
            throw new Error('user_not_found');
        }

        const rewardSummary: Record<string, number | string> = {};
        const summaryDetails = () => ({
            userId,
            reason: reason || 'scheduled_reward',
            rewardSummary
        });

        try {
            if (rewards.gold && rewards.gold > 0) {
                await UserDB.addGold(userId, rewards.gold);
                rewardSummary.gold = rewards.gold;
            }

            if (rewards.tickets && rewards.tickets > 0) {
                await UserDB.addTickets(userId, rewards.tickets);
                rewardSummary.tickets = rewards.tickets;
            }

            if (rewards.exp && rewards.exp > 0) {
                await LevelSystem.addExp(userId, rewards.exp, ExpSource.Admin);
                rewardSummary.exp = rewards.exp;
            }

            if (rewards.items && rewards.items.length > 0) {
                for (const item of rewards.items) {
                    await ItemSystem.addItem(userId, item.itemId, item.quantity);
                }
                rewardSummary.items = rewards.items.length;
            }

            if (rewards.skins && rewards.skins.length > 0) {
                for (const skinId of rewards.skins) {
                    await SkinSystem.unlockSkin(userId, skinId);
                }
                rewardSummary.skins = rewards.skins.length;
            }

            if (rewards.vipDays && rewards.vipDays > 0) {
                await VIPSystem.activateVIP(userId, 1, rewards.vipDays);
                rewardSummary.vipDays = rewards.vipDays;
            }

            // 记录审计
            const logsCollection = MongoDBService.getCollection('admin_logs');
            await logsCollection.insertOne({
                adminId: 'scheduler',
                action: 'grant_reward',
                targetUserId: userId,
                rewards,
                reason: reason || 'scheduled_reward',
                timestamp: Date.now()
            });

            return {
                logMeta: {
                    details: summaryDetails()
                }
            };
        } catch (err) {
            (err as JobError).logMeta = { details: summaryDetails() };
            throw err;
        }
    }

    private static async runWebhookJob(payload: any): Promise<JobExecuteResult> {
        const url = payload.url;
        if (!url) {
            throw new Error('url_required');
        }
        const method = payload.method || 'POST';
        const headers = payload.headers || { 'Content-Type': 'application/json' };
        const body = payload.body ? JSON.stringify(payload.body) : undefined;
        const requestBodyPreview = body ? this.truncatePreview(body) : undefined;
        try {
            const res = await fetch(url, { method, headers, body, timeout: 10_000 });
            const responseText = await res.text().catch(() => '');
            const responseBodyPreview = responseText ? this.truncatePreview(responseText) : undefined;
            const logMeta = {
                httpStatus: res.status,
                url,
                method,
                requestBodyPreview,
                responseBodyPreview
            };
            if (!res.ok) {
                const error: JobError = new Error(`webhook_http_${res.status}`) as JobError;
                error.logMeta = logMeta;
                throw error;
            }
            return { logMeta };
        } catch (err) {
            const error = err as JobError;
            if (!error.logMeta) {
                error.logMeta = {
                    url,
                    method,
                    requestBodyPreview
                };
            }
            throw error;
        }
    }

    private static truncatePreview(value: string, limit = 400) {
        if (value.length <= limit) {
            return value;
        }
        return value.slice(0, limit) + '…';
    }
}
