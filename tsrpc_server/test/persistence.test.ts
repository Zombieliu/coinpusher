import { strict as assert } from 'assert';

// Stubs
import { MongoDBService } from '../src/server/gate/db/MongoDBService';
import { TaskSystem, TaskType, TaskGoalType } from '../src/server/gate/bll/TaskSystem';
import { AchievementSystem, AchievementStatus } from '../src/server/gate/bll/AchievementSystem';
import { SocialSystem, FriendStatus } from '../src/server/gate/bll/SocialSystem';

type Doc = any;

class FakeCollection {
    docs: Doc[] = [];
    indexes: any[] = [];
    constructor(private name: string) {}
    find(query: any) {
        const arr = this.docs.filter(d => Object.keys(query).every(k => d[k] === query[k]));
        return {
            toArray: async () => arr
        };
    }
    async findOne(query: any) {
        return this.docs.find(d => Object.keys(query).every(k => d[k] === query[k])) || null;
    }
    async insertOne(doc: Doc) {
        this.docs.push({ ...doc });
    }
    async insertMany(arr: Doc[]) {
        this.docs.push(...arr.map(d => ({ ...d })));
    }
    async deleteMany(query: any) {
        this.docs = this.docs.filter(d => !Object.keys(query).every(k => d[k] === query[k]));
    }
    async updateOne(query: any, update: any, opts: any = {}) {
        const idx = this.docs.findIndex(d => Object.keys(query).every(k => d[k] === query[k]));
        if (idx === -1) {
            if (opts.upsert) {
                const newDoc = { ...(update.$set || {}) };
                this.docs.push(newDoc);
            }
            return;
        }
        this.docs[idx] = { ...this.docs[idx], ...(update.$set || {}) };
    }
    initializeUnorderedBulkOp() {
        const ops: any[] = [];
        return {
            find: (query: any) => ({
                upsert: () => ({
                    updateOne: (payload: any) => {
                        ops.push({ query, update: payload.$set });
                    }
                })
            }),
            execute: async () => {
                for (const op of ops) {
                    await this.updateOne(op.query, { $set: op.update }, { upsert: true });
                }
            }
        };
    }
    async createIndex() {
        this.indexes.push({});
    }
}

// Fake DB registry
const collections: Record<string, FakeCollection> = {};
MongoDBService.getCollection = ((name: string) => {
    if (!collections[name]) {
        collections[name] = new FakeCollection(name);
    }
    return collections[name] as any;
}) as any;

// Stub UserDB to avoid real Mongo dependency
const userStore: Record<string, any> = {};
const UserDB = require('../src/server/gate/data/UserDB');
UserDB.UserDB.getUserById = async (userId: string) => {
    if (!userStore[userId]) {
        userStore[userId] = { userId, username: `user_${userId}`, gold: 10000 };
    }
    return userStore[userId];
};
UserDB.UserDB.updateUser = async (userId: string, patch: any) => {
    const existing = await UserDB.UserDB.getUserById(userId);
    userStore[userId] = { ...existing, ...patch };
};
UserDB.UserDB.addTickets = async () => {};

describe('Persistence (mocked MongoDBService)', () => {
    it('TaskSystem should persist daily tasks and claim reward', async () => {
        const userId = 'u1';
        const tasks = await TaskSystem.getUserTasks(userId, TaskType.Daily);
        assert.ok(tasks.length > 0);

        // mark first task completed
        await TaskSystem.updateTaskProgress(userId, TaskGoalType.DropCoins, tasks[0].goalValue);
        const res = await TaskSystem.claimTaskReward(userId, tasks[0].taskId);
        assert.equal(res.success, true);

        // ensure persisted
        const col = collections['user_tasks'];
        const stored = await col.find({ userId }).toArray();
        assert.ok(stored.some((t: any) => t.taskId === tasks[0].taskId && t.status === 'claimed'));
    });

    it('Checkin should persist to user_checkins', async () => {
        const userId = 'u2';
        // stub checkin without real time dependency
        await TaskSystem.checkin(userId);
        const col = collections['user_checkins'];
        const stored = await col.findOne({ userId });
        assert.ok(stored);
        assert.equal(stored.userId, userId);
    });

    it('AchievementSystem should persist unlock and claim (mocked)', async () => {
        const userId = 'u3';
        const achievementId = 'beginner_first_drop'; // 使用内置配置，避免与真实异步路径不一致

        // 解锁（mock 依赖内存 + FakeCollection）
        const unlocked = await AchievementSystem.updateAchievementProgress(userId, achievementId, 1);
        assert.equal(unlocked?.status, AchievementStatus.Unlocked);

        // 领取奖励并落库
        const claim = await AchievementSystem.claimAchievementReward(userId, achievementId);
        assert.equal(claim.success, true);

        // 校验持久化结果
        const col = collections['user_achievements'];
        const stored = await col.findOne({ userId, achievementId });
        assert.ok(stored);
        assert.equal(stored.status, AchievementStatus.Claimed);
        assert.equal(stored.currentProgress, 1);
        assert.ok(stored.claimedAt);
        assert.ok(stored.unlockedAt);
        // 奖励已写入用户数据（mock UserDB）
        assert.equal(userStore[userId].gold, 10000 + (claim.reward?.gold || 0));
    });

    it('SocialSystem should persist friend request', async () => {
        const from = 'u4', to = 'u5';
        await SocialSystem.sendFriendRequest(from, to, 'hi');
        const col = collections['friend_requests'];
        const stored = await col.find({ toUserId: to }).toArray();
        assert.equal(stored.length, 1);
        assert.equal(stored[0].status, 'pending');
    });
});
