import { ApiCall } from "tsrpc";
import { ReqPurchaseBattlePass, ResPurchaseBattlePass } from "../../../tsrpc/protocols/gate/PtlPurchaseBattlePass";

export default async function (call: ApiCall<ReqPurchaseBattlePass, ResPurchaseBattlePass>) {
    // TODO
    call.error('API Not Implemented');
}