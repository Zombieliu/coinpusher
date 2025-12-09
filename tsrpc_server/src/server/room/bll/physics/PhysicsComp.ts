import { ecs } from "../../../../core/ecs/ECS";
import { PhysicsWorld } from "./PhysicsWorld";

@ecs.register('Physics')
export class PhysicsComp extends ecs.Comp {
    world: PhysicsWorld | null = null;

    /** 上一次广播的时间 */
    lastBroadcastTime: number = 0;

    /** 服务端世界时钟 (tick计数器) - 格斗游戏级别的时序基准 */
    serverTick: number = 0;

    /** 广播间隔 (ms) - 比如 50ms (20Hz) */
    readonly BROADCAST_INTERVAL = 50;

    /** 物理步长 (s) */
    readonly FIXED_TIME_STEP = 1 / 30;

    /** Tick 间隔 (ms) - 和 FIXED_TIME_STEP 对应，约 33ms (30Hz) */
    readonly TICK_INTERVAL_MS = Math.floor((1 / 30) * 1000);

    reset() {
        this.world = null;
        this.lastBroadcastTime = 0;
        this.serverTick = 0;
    }
}
