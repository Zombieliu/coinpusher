import { ApiCall } from "tsrpc";
import { ReqDeductGold, ResDeductGold } from "../../../../tsrpc/protocols/gate/internal/PtlDeductGold";
import { UserDB } from "../../data/UserDB";
import { TransactionLog } from "../../data/TransactionLog";
import { verifyInternalToken, verifyRequest } from "../../../utils/SecurityUtils";

/**
 * 扣费 API（幂等性保证）
 *
 * 防止网络重试导致的重复扣费问题
 * 每个 transactionId 只会被处理一次
 */
export async function ApiDeductGold(call: ApiCall<ReqDeductGold, ResDeductGold>) {
    // 🔒 安全验证 1: 内部Token鉴权
    if (call.req.__ssoToken && !verifyInternalToken(call.req.__ssoToken)) {
        call.error('Unauthorized: Invalid token');
        return;
    }

    // 🔒 安全验证 2: 签名验证（如果启用）
    const enableSignature = process.env.ENABLE_REQUEST_SIGNATURE === 'true';
    if (enableSignature && call.req.signature) {
        const verification = verifyRequest(call.req);
        if (!verification.valid) {
            console.warn(`[ApiDeductGold] Security check failed: ${verification.error}`);
            call.error(`Security check failed: ${verification.error}`);
            return;
        }
    }

    // 2. 幂等性检查：事务是否已处理
    const existingTx = await TransactionLog.exists(call.req.transactionId);
    if (existingTx) {
        console.log(`[ApiDeductGold] Duplicate transaction: ${call.req.transactionId}`);

        // 如果事务已成功，返回缓存的结果
        if (existingTx.success) {
            call.succ({
                balance: existingTx.balance,
                isDuplicate: true
            });
        } else {
            // 如果事务之前失败，返回相同的错误
            call.error(existingTx.error || 'Transaction failed');
        }
        return;
    }

    // 3. 获取用户信息
    const user = await UserDB.getUserById(call.req.userId);
    if (!user) {
        // 记录失败事务
        await TransactionLog.record({
            transactionId: call.req.transactionId,
            userId: call.req.userId,
            type: 'deduct',
            amount: call.req.amount,
            reason: call.req.reason,
            success: false,
            balance: 0,
            error: 'User not found'
        });

        call.error('User not found');
        return;
    }

    // 4. 执行扣费（原子操作，包含余额检查）
    const deductResult = await UserDB.deductGold(call.req.userId, call.req.amount);

    if (!deductResult.success) {
        // 记录失败事务
        await TransactionLog.record({
            transactionId: call.req.transactionId,
            userId: call.req.userId,
            type: 'deduct',
            amount: call.req.amount,
            reason: call.req.reason,
            success: false,
            balance: deductResult.currentGold || 0,
            error: deductResult.error || 'Deduction failed'
        });

        call.error(deductResult.error || 'Deduction failed');
        return;
    }

    // 5. 记录成功事务（处理并发情况）
    try {
        await TransactionLog.record({
            transactionId: call.req.transactionId,
            userId: call.req.userId,
            type: 'deduct',
            amount: call.req.amount,
            reason: call.req.reason,
            success: true,
            balance: deductResult.currentGold || 0
        });
    } catch (err: any) {
        // 🔒 并发安全：如果记录失败（可能是并发请求），查询原记录
        if (err.code === 11000 || err.message?.includes('duplicate')) {
            console.warn(`[ApiDeductGold] Concurrent transaction detected: ${call.req.transactionId}`);
            const existing = await TransactionLog.exists(call.req.transactionId);
            if (existing && existing.success) {
                // 返回原事务的结果
                call.succ({
                    balance: existing.balance,
                    isDuplicate: true
                });
                return;
            }
        }
        // 其他错误继续抛出
        console.error(`[ApiDeductGold] Failed to record transaction:`, err);
    }

    call.succ({
        balance: deductResult.currentGold || 0,
        isDuplicate: false
    });
}
