import { ApiCall } from "tsrpc";
import { ReqSignIn, ResSignIn } from "../../../tsrpc/protocols/gate/PtlSignIn";
import { SignInSystem } from "../bll/SignInSystem";

export async function ApiSignIn(call: ApiCall<ReqSignIn, ResSignIn>) {
    try {
        const { userId } = call.req;
        const result = await SignInSystem.signIn(userId);
        call.succ(result);
    } catch (error) {
        console.error('[ApiSignIn] Error:', error);
        call.error("签到失败");
    }
}
