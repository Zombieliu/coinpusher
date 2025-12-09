/**
 * 📋 任务系统
 *
 * 功能：
 * 1. 每日任务（每日刷新）
 * 2. 每周任务（每周刷新）
 * 3. 7日签到
 * 4. 任务进度追踪
 * 5. 任务奖励发放
 */

import { UserDB } from '../data/UserDB';
import { ObjectId } from 'mongodb';

/** 任务类型 */
export enum TaskType {
    Daily = 'daily',           // 每日任务
    Weekly = 'weekly',         // 每周任务
    Checkin = 'checkin'        // 签到任务
}

/** 任务状态 */
export enum TaskStatus {
    Locked = 'locked',         // 未解锁
    Active = 'active',         // 进行中
    Completed = 'completed',   // 已完成
    Claimed = 'claimed'        // 已领取
}

/** 任务目标类型 */
export enum TaskGoalType {
    DropCoins = 'drop_coins',           // 投币次数
    CollectCoins = 'collect_coins',     // 收集金币数量
    TriggerSmallPrize = 'trigger_small',// 触发小奖次数
    TriggerBigPrize = 'trigger_big',    // 触发大奖次数
    DrawLottery = 'draw_lottery',       // 抽奖次数
    Login = 'login',                    // 登录天数
    ConsecutiveLogin = 'consecutive_login', // 连续登录天数
    TotalReward = 'total_reward'        // 累计收益
}

/** 任务奖励 */
export interface TaskReward {
    gold?: number;             // 金币奖励
    tickets?: number;          // 彩票奖励
    exp?: number;              // 经验奖励
    items?: Array<{            // 物品奖励
        itemId: string;
        quantity: number;
    }>;
}

/** 任务配置 */
export interface TaskConfig {
    taskId: string;            // 任务ID
    taskType: TaskType;        // 任务类型
    name: string;              // 任务名称
    description: string;       // 任务描述
    goalType: TaskGoalType;    // 目标类型
    goalValue: number;         // 目标值
    reward: TaskReward;        // 奖励
    order: number;             // 排序
}

/** 用户任务进度 */
export interface UserTask {
    _id?: ObjectId;
    taskId: string;
    taskType: TaskType;
    status: TaskStatus;
    currentProgress: number;
    goalValue: number;
    reward: TaskReward;
    completedAt?: number;      // 完成时间
    claimedAt?: number;        // 领取时间
    createdAt?: number;
}

/** 签到数据 */
export interface CheckinData {
    userId: string;
    checkinDays: number;       // 累计签到天数
    consecutiveDays: number;   // 连续签到天数
    lastCheckinDate: string;   // 最后签到日期（YYYY-MM-DD）
    checkinHistory: string[];  // 签到历史（日期数组）
}

export class TaskSystem {
    /**
     * 每日任务配置
     */
    private static readonly DAILY_TASKS: TaskConfig[] = [
        {
            taskId: 'daily_drop_10',
            taskType: TaskType.Daily,
            name: '推币新手',
            description: '投币10次',
            goalType: TaskGoalType.DropCoins,
            goalValue: 10,
            reward: { gold: 50, exp: 10 },
            order: 1
        },
        {
            taskId: 'daily_drop_50',
            taskType: TaskType.Daily,
            name: '推币达人',
            description: '投币50次',
            goalType: TaskGoalType.DropCoins,
            goalValue: 50,
            reward: { gold: 200, tickets: 1, exp: 30 },
            order: 2
        },
        {
            taskId: 'daily_small_prize_3',
            taskType: TaskType.Daily,
            name: '小试牛刀',
            description: '触发小奖3次',
            goalType: TaskGoalType.TriggerSmallPrize,
            goalValue: 3,
            reward: { gold: 100, exp: 20 },
            order: 3
        },
        {
            taskId: 'daily_collect_500',
            taskType: TaskType.Daily,
            name: '财富积累',
            description: '累计收集500金币',
            goalType: TaskGoalType.CollectCoins,
            goalValue: 500,
            reward: { gold: 150, tickets: 1, exp: 25 },
            order: 4
        },
        {
            taskId: 'daily_lottery_3',
            taskType: TaskType.Daily,
            name: '运气试炼',
            description: '抽奖3次',
            goalType: TaskGoalType.DrawLottery,
            goalValue: 3,
            reward: { gold: 100, tickets: 2, exp: 30 },
            order: 5
        }
    ];

    /**
     * 每周任务配置
     */
    private static readonly WEEKLY_TASKS: TaskConfig[] = [
        {
            taskId: 'weekly_drop_300',
            taskType: TaskType.Weekly,
            name: '推币大师',
            description: '本周投币300次',
            goalType: TaskGoalType.DropCoins,
            goalValue: 300,
            reward: { gold: 1000, tickets: 5, exp: 100 },
            order: 1
        },
        {
            taskId: 'weekly_big_prize_5',
            taskType: TaskType.Weekly,
            name: '大奖猎人',
            description: '触发大奖5次',
            goalType: TaskGoalType.TriggerBigPrize,
            goalValue: 5,
            reward: { gold: 800, tickets: 3, exp: 80 },
            order: 2
        },
        {
            taskId: 'weekly_login_5',
            taskType: TaskType.Weekly,
            name: '忠实玩家',
            description: '本周登录5天',
            goalType: TaskGoalType.Login,
            goalValue: 5,
            reward: { gold: 500, tickets: 2, exp: 50 },
            order: 3
        },
        {
            taskId: 'weekly_reward_5000',
            taskType: TaskType.Weekly,
            name: '财富大亨',
            description: '本周累计收益5000金币',
            goalType: TaskGoalType.TotalReward,
            goalValue: 5000,
            reward: { gold: 1500, tickets: 5, exp: 120 },
            order: 4
        }
    ];

    /**
     * 7日签到奖励配置
     */
    private static readonly CHECKIN_REWARDS: TaskReward[] = [
        { gold: 50, exp: 5 },      // 第1天
        { gold: 80, exp: 8 },      // 第2天
        { gold: 100, exp: 10 },    // 第3天
        { gold: 150, tickets: 1, exp: 15 },   // 第4天
        { gold: 200, tickets: 1, exp: 20 },   // 第5天
        { gold: 300, tickets: 2, exp: 30 },   // 第6天
        { gold: 500, tickets: 5, exp: 50 }    // 第7天（翻倍）
    ];

    /**
     * 内存存储（生产环境应使用MongoDB）
     */
    private static userTasksMap = new Map<string, UserTask[]>();
    private static userCheckinMap = new Map<string, CheckinData>();

    /**
     * 获取用户任务列表
     */
    static async getUserTasks(userId: string, taskType: TaskType): Promise<UserTask[]> {
        const key = `${userId}_${taskType}`;

        // 检查是否需要刷新任务
        await this.refreshTasksIfNeeded(userId, taskType);

        // 返回用户任务列表
        const allTasks = this.userTasksMap.get(key) || [];
        return allTasks.filter(t => t.taskType === taskType);
    }

    /**
     * 刷新任务（如果需要）
     */
    private static async refreshTasksIfNeeded(userId: string, taskType: TaskType): Promise<void> {
        const key = `${userId}_${taskType}`;
        const existingTasks = this.userTasksMap.get(key);

        // 检查是否需要刷新
        const needRefresh = this.checkNeedRefresh(taskType, existingTasks);

        if (needRefresh) {
            console.log(`[TaskSystem] 刷新用户 ${userId} 的 ${taskType} 任务`);
            const tasks = taskType === TaskType.Daily
                ? this.DAILY_TASKS
                : this.WEEKLY_TASKS;

            const userTasks: UserTask[] = tasks.map(config => ({
                taskId: config.taskId,
                taskType: config.taskType,
                status: TaskStatus.Active,
                currentProgress: 0,
                goalValue: config.goalValue,
                reward: config.reward
            }));

            this.userTasksMap.set(key, userTasks);
        }
    }

    /**
     * 检查是否需要刷新任务
     */
    private static checkNeedRefresh(taskType: TaskType, existingTasks?: UserTask[]): boolean {
        if (!existingTasks || existingTasks.length === 0) {
            return true;
        }

        const now = Date.now();
        const lastRefresh = existingTasks[0]?.createdAt || 0;

        if (taskType === TaskType.Daily) {
            // 每日任务：检查是否跨天（0点刷新）
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTimestamp = today.getTime();

            return lastRefresh < todayTimestamp;
        } else if (taskType === TaskType.Weekly) {
            // 每周任务：检查是否跨周（周一0点刷新）
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ...
            const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 如果是周日，1天后是周一；否则8-dayOfWeek
            const lastMonday = new Date(today);
            lastMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // 上个周一
            lastMonday.setHours(0, 0, 0, 0);
            const lastMondayTimestamp = lastMonday.getTime();

            return lastRefresh < lastMondayTimestamp;
        }

        return false;
    }

    /**
     * 更新任务进度
     */
    static async updateTaskProgress(
        userId: string,
        goalType: TaskGoalType,
        increment: number = 1
    ): Promise<UserTask[]> {
        const updatedTasks: UserTask[] = [];

        // 更新每日任务
        const dailyKey = `${userId}_${TaskType.Daily}`;
        const dailyTasks = this.userTasksMap.get(dailyKey) || [];

        for (const task of dailyTasks) {
            if (this.getGoalTypeForTask(task.taskId) === goalType && task.status === TaskStatus.Active) {
                task.currentProgress += increment;

                // 检查是否完成
                if (task.currentProgress >= task.goalValue) {
                    task.status = TaskStatus.Completed;
                    task.completedAt = Date.now();
                    updatedTasks.push(task);
                    console.log(`[TaskSystem] 用户 ${userId} 完成任务：${task.taskId}`);
                }
            }
        }

        // 更新每周任务
        const weeklyKey = `${userId}_${TaskType.Weekly}`;
        const weeklyTasks = this.userTasksMap.get(weeklyKey) || [];

        for (const task of weeklyTasks) {
            if (this.getGoalTypeForTask(task.taskId) === goalType && task.status === TaskStatus.Active) {
                task.currentProgress += increment;

                if (task.currentProgress >= task.goalValue) {
                    task.status = TaskStatus.Completed;
                    task.completedAt = Date.now();
                    updatedTasks.push(task);
                    console.log(`[TaskSystem] 用户 ${userId} 完成任务：${task.taskId}`);
                }
            }
        }

        return updatedTasks;
    }

    /**
     * 获取任务的目标类型
     */
    private static getGoalTypeForTask(taskId: string): TaskGoalType | null {
        const allTasks = [...this.DAILY_TASKS, ...this.WEEKLY_TASKS];
        const task = allTasks.find(t => t.taskId === taskId);
        return task?.goalType || null;
    }

    /**
     * 领取任务奖励
     */
    static async claimTaskReward(userId: string, taskId: string): Promise<{
        success: boolean;
        reward?: TaskReward;
        error?: string;
    }> {
        // 查找任务
        const task = this.findUserTask(userId, taskId);

        if (!task) {
            return { success: false, error: '任务不存在' };
        }

        if (task.status === TaskStatus.Claimed) {
            return { success: false, error: '奖励已领取' };
        }

        if (task.status !== TaskStatus.Completed) {
            return { success: false, error: '任务未完成' };
        }

        // 发放奖励
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        // 更新用户数据
        const updates: any = {
            gold: user.gold + (task.reward.gold || 0)
        };

        if (task.reward.tickets) {
            await UserDB.addTickets(userId, task.reward.tickets);
        }

        if (task.reward.exp) {
            // TODO: 更新经验值（需要实现等级系统）
        }

        await UserDB.updateUser(userId, updates);

        // 更新任务状态
        task.status = TaskStatus.Claimed;
        task.claimedAt = Date.now();

        console.log(`[TaskSystem] 用户 ${userId} 领取任务奖励：${taskId}`);

        return {
            success: true,
            reward: task.reward
        };
    }

    /**
     * 查找用户任务
     */
    private static findUserTask(userId: string, taskId: string): UserTask | null {
        const dailyKey = `${userId}_${TaskType.Daily}`;
        const weeklyKey = `${userId}_${TaskType.Weekly}`;

        const dailyTasks = this.userTasksMap.get(dailyKey) || [];
        const weeklyTasks = this.userTasksMap.get(weeklyKey) || [];

        return [...dailyTasks, ...weeklyTasks].find(t => t.taskId === taskId) || null;
    }

    /**
     * 签到
     */
    static async checkin(userId: string): Promise<{
        success: boolean;
        reward?: TaskReward;
        checkinDays?: number;
        consecutiveDays?: number;
        error?: string;
    }> {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // 获取签到数据
        let checkinData = this.userCheckinMap.get(userId);

        if (!checkinData) {
            checkinData = {
                userId,
                checkinDays: 0,
                consecutiveDays: 0,
                lastCheckinDate: '',
                checkinHistory: []
            };
            this.userCheckinMap.set(userId, checkinData);
        }

        // 检查是否已签到
        if (checkinData.lastCheckinDate === today) {
            return { success: false, error: '今日已签到' };
        }

        // 检查连续签到
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

        if (checkinData.lastCheckinDate === yesterday) {
            // 连续签到
            checkinData.consecutiveDays++;
        } else {
            // 断签，重置连续天数
            checkinData.consecutiveDays = 1;
        }

        // 更新签到数据
        checkinData.checkinDays++;
        checkinData.lastCheckinDate = today;
        checkinData.checkinHistory.push(today);

        // 计算奖励（7日循环）
        const rewardIndex = (checkinData.consecutiveDays - 1) % 7;
        const reward = this.CHECKIN_REWARDS[rewardIndex];

        // 发放奖励
        const user = await UserDB.getUserById(userId);
        if (!user) {
            return { success: false, error: '用户不存在' };
        }

        await UserDB.updateUser(userId, {
            gold: user.gold + (reward.gold || 0)
        });

        if (reward.tickets) {
            await UserDB.addTickets(userId, reward.tickets);
        }

        console.log(`[TaskSystem] 用户 ${userId} 签到成功！连续${checkinData.consecutiveDays}天`);

        return {
            success: true,
            reward,
            checkinDays: checkinData.checkinDays,
            consecutiveDays: checkinData.consecutiveDays
        };
    }

    /**
     * 获取签到信息
     */
    static getCheckinInfo(userId: string): CheckinData {
        let checkinData = this.userCheckinMap.get(userId);

        if (!checkinData) {
            checkinData = {
                userId,
                checkinDays: 0,
                consecutiveDays: 0,
                lastCheckinDate: '',
                checkinHistory: []
            };
            this.userCheckinMap.set(userId, checkinData);
        }

        return checkinData;
    }

    /**
     * 获取任务统计
     */
    static getTaskStats(userId: string): {
        dailyCompleted: number;
        dailyTotal: number;
        weeklyCompleted: number;
        weeklyTotal: number;
    } {
        const dailyKey = `${userId}_${TaskType.Daily}`;
        const weeklyKey = `${userId}_${TaskType.Weekly}`;

        const dailyTasks = this.userTasksMap.get(dailyKey) || [];
        const weeklyTasks = this.userTasksMap.get(weeklyKey) || [];

        return {
            dailyCompleted: dailyTasks.filter(t => t.status === TaskStatus.Completed || t.status === TaskStatus.Claimed).length,
            dailyTotal: dailyTasks.length,
            weeklyCompleted: weeklyTasks.filter(t => t.status === TaskStatus.Completed || t.status === TaskStatus.Claimed).length,
            weeklyTotal: weeklyTasks.length
        };
    }
}
