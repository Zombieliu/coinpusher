import { ApiCall } from "tsrpc";
import { ReqGetUserTasks, ResGetUserTasks } from "../../../tsrpc/protocols/gate/PtlGetUserTasks";

export default async function (call: ApiCall<ReqGetUserTasks, ResGetUserTasks>) {
    // TODO
    call.error('API Not Implemented');
}