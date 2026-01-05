export enum TaskType {
    Daily = 'daily',
    Weekly = 'weekly',
    Achievement = 'achievement'
}

export enum TaskStatus {
    Pending = 'pending',
    Completed = 'completed',
    Claimed = 'claimed'
}

export interface TaskReward {
    gold?: number;
    tickets?: number;
    items?: Array<{ itemId: string; quantity: number }>;
    exp?: number;
}

export interface CheckinData {
    day: number;
    reward: TaskReward;
}

export interface UserTask {
    taskId: string;
    type: TaskType;
    status: TaskStatus;
    progress?: number;
    target?: number;
    reward?: TaskReward;
}
