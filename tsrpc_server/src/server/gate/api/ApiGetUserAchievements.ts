import { ApiCall } from "tsrpc";
import { ReqGetUserAchievements, ResGetUserAchievements } from "../../../tsrpc/protocols/gate/PtlGetUserAchievements";

export default async function (call: ApiCall<ReqGetUserAchievements, ResGetUserAchievements>) {
    // TODO
    call.error('API Not Implemented');
}