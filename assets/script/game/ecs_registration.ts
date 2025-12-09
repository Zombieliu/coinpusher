import { CoinPusher } from "./coinpusher/CoinPusher";
import { Initialize } from "./initialize/Initialize";

// 导入所有 ECS 组件，确保它们被加载，从而触发 @ecs.register 装饰器

// Model Layer
import { CoinModelComp } from "./coinpusher/model/CoinModelComp";
import { GameStateComp } from "./coinpusher/model/GameStateComp";

// BLL Layer
import { PhysicsComp } from "./coinpusher/bll/PhysicsComp";
import { RewardComp } from "./coinpusher/bll/RewardComp";
import { JackpotComp } from "./coinpusher/bll/JackpotComp";
import { EffectComp } from "./coinpusher/bll/EffectComp";

// View Layer
import { GameViewComp } from "./coinpusher/view/GameViewComp";

// 确保这些类被加载，从而触发 @ecs.register 装饰器
export {
    CoinPusher,
    Initialize,
    CoinModelComp,
    GameStateComp,
    PhysicsComp,
    RewardComp,
    JackpotComp,
    EffectComp,
    GameViewComp
};