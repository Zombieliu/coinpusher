import { TaskType, UserTask } from '../../../server/gate/bll/TaskSystem';

export interface ReqGetUserTasks {
    taskType: TaskType;
}

export interface ResGetUserTasks {
    tasks: UserTask[];
    stats: {
        dailyCompleted: number;
        dailyTotal: number;
        weeklyCompleted: number;
        weeklyTotal: number;
    };
}
