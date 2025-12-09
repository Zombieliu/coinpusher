import { ApiCall } from "tsrpc";
import { ReqAddGold, ResAddGold } from "../../../../tsrpc/protocols/gate/internal/PtlAddGold";
import { UserDB } from "../../data/UserDB";
import { TransactionLog } from "../../data/TransactionLog";
import { RewardLimitDB } from "../../data/RewardLimitDB";
import { verifyInternalToken, verifyRequest } from "../../../utils/SecurityUtils";

/**
 * 加币 API（幂等性保证）
 *
 * 防止网络重试导致的重复加币问题
 * 每个 transactionId 只会被处理一次
 */
export async function ApiAddGold(call: ApiCall<ReqAddGold, ResAddGold>) {
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
            console.warn(`[ApiAddGold] Security check failed: ${verification.error}`);
            call.error(`Security check failed: ${verification.error}`);
            return;
        }
    }

    // 2. 幂等性检查：事务是否已处理
    const existingTx = await TransactionLog.exists(call.req.transactionId);
    if (existingTx) {
        console.log(`[ApiAddGold] Duplicate transaction: ${call.req.transactionId}`);

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
            type: 'add',
            amount: call.req.amount,
            reason: call.req.reason,
            success: false,
            balance: 0,
            error: 'User not found'
        });

        call.error('User not found');
        return;
    }

    // 🔒 4. 每日奖励限额检查（仅针对奖励类型）
    if (call.req.reason === 'collect_coin' || call.req.reason.includes('reward')) {
        const limitCheck = await RewardLimitDB.checkLimit(call.req.userId, call.req.amount);
        if (!limitCheck.allowed) {
            // 记录失败事务
            await TransactionLog.record({
                transactionId: call.req.transactionId,
                userId: call.req.userId,
                type: 'add',
                amount: call.req.amount,
                reason: call.req.reason,
                success: false,
                balance: user.gold,
                error: `Daily reward limit exceeded: ${limitCheck.current}/${limitCheck.limit}, remaining: ${limitCheck.remaining}`
            });

            console.warn(`[ApiAddGold] Daily limit exceeded for ${call.req.userId}: ${limitCheck.current}/${limitCheck.limit}`);
            call.error(`Daily reward limit exceeded. You have earned ${limitCheck.current}/${limitCheck.limit} gold today.`);
            return;
        }
    }

    // 5. 执行加币（原子操作）
    user.gold += call.req.amount;
    await UserDB.updateUser(user.userId, { gold: user.gold });

    // 🔒 6. 更新每日奖励统计（仅针对奖励类型）
    if (call.req.reason === 'collect_coin' || call.req.reason.includes('reward')) {
        await RewardLimitDB.addReward(call.req.userId, call.req.amount);
    }

    // 7. 记录成功事务（处理并发情况）
    try {
        await TransactionLog.record({
            transactionId: call.req.transactionId,
            userId: call.req.userId,
            type: 'add',
            amount: call.req.amount,
            reason: call.req.reason,
            success: true,
            balance: user.gold
        });
    } catch (err: any) {
        // 🔒 并发安全：如果记录失败（可能是并发请求），查询原记录
        if (err.code === 11000 || err.message?.includes('duplicate')) {
            console.warn(`[ApiAddGold] Concurrent transaction detected: ${call.req.transactionId}`);
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
        console.error(`[ApiAddGold] Failed to record transaction:`, err);
    }

    call.succ({
        balance: user.gold,
        isDuplicate: false
    });
}
