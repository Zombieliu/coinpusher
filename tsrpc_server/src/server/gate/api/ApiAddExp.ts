import { ApiCall } from "tsrpc";
import { ReqAddExp, ResAddExp } from "../../../tsrpc/protocols/gate/PtlAddExp";
import { LevelSystem, ExpSource } from "../bll/LevelSystem";

export default async function (call: ApiCall<ReqAddExp, ResAddExp>) {
    const { userId, exp } = call.req;
    const result = await LevelSystem.addExp(userId, exp, ExpSource.Admin);
    call.succ(result);
}
