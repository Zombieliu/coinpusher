import { ApiCall } from "tsrpc";
import { ReqGetUserTasks, ResGetUserTasks } from "../../../tsrpc/protocols/gate/PtlGetUserTasks";
import { TaskSystem, TaskType } from "../bll/TaskSystem";

export default async function (call: ApiCall<ReqGetUserTasks, ResGetUserTasks>) {
    const userId = (call.conn as any)?.userId || (call.req as any).userId;
    if (!userId) {
        call.error('缺少 userId');
        return;
    }

    const daily = await TaskSystem.getUserTasks(userId, TaskType.Daily);
    const weekly = await TaskSystem.getUserTasks(userId, TaskType.Weekly);
    const statsRaw = TaskSystem.getTaskStats(userId);
    const stats = {
        total: statsRaw.dailyTotal + statsRaw.weeklyTotal,
        completed: statsRaw.dailyCompleted + statsRaw.weeklyCompleted,
        dailyCompleted: statsRaw.dailyCompleted,
        dailyTotal: statsRaw.dailyTotal,
        weeklyCompleted: statsRaw.weeklyCompleted,
        weeklyTotal: statsRaw.weeklyTotal
    };

    call.succ({
        tasks: [...daily, ...weekly],
        daily,
        weekly,
        stats
    });
}
