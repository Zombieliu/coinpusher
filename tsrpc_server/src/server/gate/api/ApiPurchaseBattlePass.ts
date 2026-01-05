import { ApiCall } from "tsrpc";
import { ReqPurchaseBattlePass, ResPurchaseBattlePass } from "../../../tsrpc/protocols/gate/PtlPurchaseBattlePass";
import { SeasonSystem } from "../bll/SeasonSystem";

export default async function (call: ApiCall<ReqPurchaseBattlePass, ResPurchaseBattlePass>) {
    const userId = (call.conn as any)?.userId || call.req.userId || 'guest';
    const result = await SeasonSystem.purchasePremiumPass(userId);
    call.succ(result);
}
