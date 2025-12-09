/**
 * 🤖 欺诈检测引擎
 *
 * 功能：
 * 1. 多维度行为分析
 * 2. 欺诈评分（0-100）
 * 3. 自动封禁/限制
 * 4. 可疑行为告警
 */

import { TransactionLog } from '../data/TransactionLog';
import { UserDB } from '../data/UserDB';
import { DeviceFingerprintService } from './DeviceFingerprintService';

export interface UserBehaviorMetrics {
    // ===== 投币行为 =====
    dropCoinFrequency: number;      // 每分钟投币次数
    dropCoinVariance: number;       // 投币时间间隔方差（ms²）
    dropCoinRegularity: number;     // 投币规律性（0-1，越低越规律）

    // ===== 收集行为 =====
    collectRate: number;            // 收集成功率（0-1）
    avgRewardPerDrop: number;       // 平均每次投币收益
    totalReward24h: number;         // 24小时总收益

    // ===== 会话行为 =====
    sessionCount24h: number;        // 24小时会话数
    avgSessionDuration: number;     // 平均会话时长（分钟）
    maxSessionDuration: number;     // 最大会话时长（分钟）

    // ===== 设备行为 =====
    deviceCount: number;            // 使用的设备数
    ipCount24h: number;             // 24小时内的IP数
    ipJumpCount: number;            // IP跳跃次数（异地登录）

    // ===== 交易行为 =====
    transactionCount24h: number;    // 24小时交易数
    failedTransactionRate: number;  // 失败交易率（0-1）

    // ===== 时间戳 =====
    calculatedAt: number;
}

export interface FraudScore {
    score: number;                  // 总分（0-100）
    level: 'low' | 'medium' | 'high' | 'critical';
    reasons: Array<{
        rule: string;
        score: number;
        description: string;
    }>;
    metrics: UserBehaviorMetrics;
    recommendation: 'allow' | 'watch' | 'restrict' | 'ban';
}

export interface FraudRule {
    name: string;
    weight: number;                 // 权重（最高分）
    check: (metrics: UserBehaviorMetrics) => {
        triggered: boolean;
        score: number;              // 0-weight
        description: string;
    };
}

export class FraudDetectionEngine {
    /**
     * 欺诈检测规则集
     */
    private static rules: FraudRule[] = [
        // 规则1: 投币频率异常
        {
            name: 'high_drop_frequency',
            weight: 20,
            check: (m) => {
                if (m.dropCoinFrequency > 30) {
                    return {
                        triggered: true,
                        score: Math.min(20, (m.dropCoinFrequency - 30) * 2),
                        description: `Extremely high drop frequency: ${m.dropCoinFrequency.toFixed(1)}/min (normal: <10)`
                    };
                } else if (m.dropCoinFrequency > 20) {
                    return {
                        triggered: true,
                        score: 10,
                        description: `High drop frequency: ${m.dropCoinFrequency.toFixed(1)}/min`
                    };
                }
                return { triggered: false, score: 0, description: '' };
            }
        },

        // 规则2: 投币间隔过于规律（机器人特征）
        {
            name: 'too_regular_pattern',
            weight: 25,
            check: (m) => {
                // regularity < 0.1 表示几乎完全规律
                if (m.dropCoinRegularity < 0.1) {
                    return {
                        triggered: true,
                        score: 25,
                        description: `Robot-like pattern: variance=${m.dropCoinVariance.toFixed(0)}ms² (too regular)`
                    };
                } else if (m.dropCoinRegularity < 0.3) {
                    return {
                        triggered: true,
                        score: 15,
                        description: `Suspicious regular pattern: regularity=${m.dropCoinRegularity.toFixed(2)}`
                    };
                }
                return { triggered: false, score: 0, description: '' };
            }
        },

        // 规则3: 收集率异常高（可能作弊）
        {
            name: 'abnormal_collect_rate',
            weight: 30,
            check: (m) => {
                // 正常用户收集率约50-70%
                if (m.collectRate > 0.9) {
                    return {
                        triggered: true,
                        score: 30,
                        description: `Impossibly high collect rate: ${(m.collectRate * 100).toFixed(1)}% (normal: 50-70%)`
                    };
                } else if (m.collectRate > 0.8) {
                    return {
                        triggered: true,
                        score: 20,
                        description: `Very high collect rate: ${(m.collectRate * 100).toFixed(1)}%`
                    };
                }
                return { triggered: false, score: 0, description: '' };
            }
        },

        // 规则4: 会话时长异常（24小时在线）
        {
            name: 'excessive_session_duration',
            weight: 15,
            check: (m) => {
                if (m.maxSessionDuration > 20 * 60) {
                    return {
                        triggered: true,
                        score: 15,
                        description: `Excessive session: ${Math.floor(m.maxSessionDuration / 60)}h (> 20h)`
                    };
                } else if (m.maxSessionDuration > 12 * 60) {
                    return {
                        triggered: true,
                        score: 10,
                        description: `Long session: ${Math.floor(m.maxSessionDuration / 60)}h`
                    };
                }
                return { triggered: false, score: 0, description: '' };
            }
        },

        // 规则5: 多设备登录（账号共享）
        {
            name: 'multiple_devices',
            weight: 20,
            check: (m) => {
                if (m.deviceCount > 5) {
                    return {
                        triggered: true,
                        score: 20,
                        description: `Too many devices: ${m.deviceCount} (possible account sharing)`
                    };
                } else if (m.deviceCount > 3) {
                    return {
                        triggered: true,
                        score: 10,
                        description: `Multiple devices: ${m.deviceCount}`
                    };
                }
                return { triggered: false, score: 0, description: '' };
            }
        },

        // 规则6: IP跳跃频繁（异地登录）
        {
            name: 'ip_jumping',
            weight: 25,
            check: (m) => {
                if (m.ipJumpCount > 5) {
                    return {
                        triggered: true,
                        score: 25,
                        description: `Frequent IP changes: ${m.ipJumpCount} jumps in 24h (possible VPN/proxy)`
                    };
                } else if (m.ipJumpCount > 3) {
                    return {
                        triggered: true,
                        score: 15,
                        description: `Multiple IP changes: ${m.ipJumpCount} jumps`
                    };
                }
                return { triggered: false, score: 0, description: '' };
            }
        },

        // 规则7: 高失败率（尝试攻击）
        {
            name: 'high_failure_rate',
            weight: 20,
            check: (m) => {
                if (m.failedTransactionRate > 0.5 && m.transactionCount24h > 10) {
                    return {
                        triggered: true,
                        score: 20,
                        description: `High failure rate: ${(m.failedTransactionRate * 100).toFixed(1)}% (possible attack)`
                    };
                } else if (m.failedTransactionRate > 0.3 && m.transactionCount24h > 20) {
                    return {
                        triggered: true,
                        score: 10,
                        description: `Elevated failure rate: ${(m.failedTransactionRate * 100).toFixed(1)}%`
                    };
                }
                return { triggered: false, score: 0, description: '' };
            }
        },

        // 规则8: 收益异常（超过每日限额90%）
        {
            name: 'approaching_daily_limit',
            weight: 15,
            check: (m) => {
                const dailyLimit = parseInt(process.env.DAILY_REWARD_LIMIT || '1000', 10);
                const ratio = m.totalReward24h / dailyLimit;

                if (ratio > 0.95) {
                    return {
                        triggered: true,
                        score: 15,
                        description: `Near daily limit: ${m.totalReward24h}/${dailyLimit} (${(ratio * 100).toFixed(1)}%)`
                    };
                } else if (ratio > 0.8) {
                    return {
                        triggered: true,
                        score: 8,
                        description: `High daily reward: ${m.totalReward24h}/${dailyLimit}`
                    };
                }
                return { triggered: false, score: 0, description: '' };
            }
        }
    ];

    /**
     * 计算欺诈评分
     */
    static async calculateFraudScore(userId: string): Promise<FraudScore> {
        // 1. 收集行为指标
        const metrics = await this.collectMetrics(userId);

        // 2. 执行规则检测
        let totalScore = 0;
        const triggeredReasons: FraudScore['reasons'] = [];

        for (const rule of this.rules) {
            const result = rule.check(metrics);
            if (result.triggered) {
                totalScore += result.score;
                triggeredReasons.push({
                    rule: rule.name,
                    score: result.score,
                    description: result.description
                });
            }
        }

        // 3. 归一化分数（0-100）
        const maxPossibleScore = this.rules.reduce((sum, r) => sum + r.weight, 0);
        const normalizedScore = Math.min(100, (totalScore / maxPossibleScore) * 100);

        // 4. 分级
        let level: FraudScore['level'];
        let recommendation: FraudScore['recommendation'];

        if (normalizedScore >= 80) {
            level = 'critical';
            recommendation = 'ban';
        } else if (normalizedScore >= 60) {
            level = 'high';
            recommendation = 'restrict';
        } else if (normalizedScore >= 30) {
            level = 'medium';
            recommendation = 'watch';
        } else {
            level = 'low';
            recommendation = 'allow';
        }

        return {
            score: Math.round(normalizedScore),
            level,
            reasons: triggeredReasons,
            metrics,
            recommendation
        };
    }

    /**
     * 收集用户行为指标
     */
    private static async collectMetrics(userId: string): Promise<UserBehaviorMetrics> {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;

        // 查询24小时内的交易记录
        const transactions = await TransactionLog.collection.find({
            userId,
            createdAt: { $gte: dayAgo }
        }).sort({ createdAt: 1 }).toArray();

        const dropTransactions = transactions.filter(t => t.reason === 'drop_coin');
        const collectTransactions = transactions.filter(t => t.reason === 'collect_coin' && t.success);
        const failedTransactions = transactions.filter(t => !t.success);

        // ===== 投币行为 =====
        const dropCoinFrequency = dropTransactions.length / (24 * 60); // 每分钟

        // 计算时间间隔方差
        const intervals: number[] = [];
        for (let i = 1; i < dropTransactions.length; i++) {
            intervals.push(dropTransactions[i].createdAt - dropTransactions[i - 1].createdAt);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length || 0;
        const dropCoinVariance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length || 0;

        // 计算规律性（变异系数）
        const dropCoinRegularity = avgInterval > 0 ? Math.sqrt(dropCoinVariance) / avgInterval : 1;

        // ===== 收集行为 =====
        const collectRate = dropTransactions.length > 0
            ? collectTransactions.length / dropTransactions.length
            : 0;

        const totalReward = collectTransactions.reduce((sum, t) => sum + t.amount, 0);
        const avgRewardPerDrop = dropTransactions.length > 0
            ? totalReward / dropTransactions.length
            : 0;

        // ===== 设备行为 =====
        const devices = await DeviceFingerprintService.getUserDevices(userId);
        const deviceCount = devices.length;

        // 统计24小时内的IP
        const recentDevices = devices.filter(d => d.lastSeen >= dayAgo);
        const uniqueIPs = new Set(recentDevices.map(d => d.ipAddress));
        const ipCount24h = uniqueIPs.size;

        // 简化IP跳跃检测（需要更复杂的地理位置判断）
        const ipJumpCount = Math.max(0, ipCount24h - 2);

        // ===== 会话行为（基于活动时间段分析）=====
        // 将24小时内的活动按时间聚类为会话（30分钟无活动视为新会话）
        const SESSION_GAP_MS = 30 * 60 * 1000; // 30分钟
        const sessions: Array<{ start: number; end: number; duration: number }> = [];

        if (dropTransactions.length > 0) {
            // 按时间排序所有活动
            const sortedActivities = dropTransactions
                .map(t => t.timestamp ?? t.createdAt)
                .sort((a, b) => a - b);

            let sessionStart = sortedActivities[0];
            let sessionEnd = sortedActivities[0];

            for (let i = 1; i < sortedActivities.length; i++) {
                const currentTime = sortedActivities[i];
                if (currentTime - sessionEnd > SESSION_GAP_MS) {
                    // 超过30分钟，记录上个会话并开始新会话
                    sessions.push({
                        start: sessionStart,
                        end: sessionEnd,
                        duration: Math.floor((sessionEnd - sessionStart) / 60000) // 转为分钟
                    });
                    sessionStart = currentTime;
                }
                sessionEnd = currentTime;
            }

            // 记录最后一个会话
            sessions.push({
                start: sessionStart,
                end: sessionEnd,
                duration: Math.floor((sessionEnd - sessionStart) / 60000)
            });
        }

        const sessionCount24h = sessions.length;
        const avgSessionDuration = sessions.length > 0
            ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
            : 0;
        const maxSessionDuration = sessions.length > 0
            ? Math.max(...sessions.map(s => s.duration))
            : 0;

        // ===== 交易行为 =====
        const transactionCount24h = transactions.length;
        const failedTransactionRate = transactions.length > 0
            ? failedTransactions.length / transactions.length
            : 0;

        return {
            dropCoinFrequency,
            dropCoinVariance,
            dropCoinRegularity,
            collectRate,
            avgRewardPerDrop,
            totalReward24h: totalReward,
            sessionCount24h,
            avgSessionDuration,
            maxSessionDuration,
            deviceCount,
            ipCount24h,
            ipJumpCount,
            transactionCount24h,
            failedTransactionRate,
            calculatedAt: now
        };
    }

    /**
     * 自动审核用户
     */
    static async autoModerate(userId: string): Promise<{
        action: 'none' | 'watch' | 'restrict' | 'ban';
        score: number;
        reasons: string[];
    }> {
        const result = await this.calculateFraudScore(userId);

        console.log(`[FraudDetection] User ${userId}: score=${result.score}, level=${result.level}`);

        if (result.recommendation === 'ban') {
            // 自动封禁
            await UserDB.updateUser(userId, {
                banned: true,
                banReason: `Auto-banned: Fraud score ${result.score}/100. ${result.reasons.map(r => r.description).join('; ')}`,
                banTime: Date.now()
            });

            console.error(`[FraudDetection] 🚫 AUTO-BANNED user ${userId} (score: ${result.score})`);

            return {
                action: 'ban',
                score: result.score,
                reasons: result.reasons.map(r => r.description)
            };
        } else if (result.recommendation === 'restrict') {
            // 限制奖励
            await UserDB.updateUser(userId, {
                rewardRestricted: true,
                restrictionReason: `Suspicious behavior: Fraud score ${result.score}/100. ${result.reasons.map(r => r.description).join('; ')}`,
                restrictionTime: Date.now()
            });

            console.warn(`[FraudDetection] ⚠️  RESTRICTED user ${userId} (score: ${result.score})`);

            return {
                action: 'restrict',
                score: result.score,
                reasons: result.reasons.map(r => r.description)
            };
        } else if (result.recommendation === 'watch') {
            // 仅记录日志
            console.warn(`[FraudDetection] 👁️  WATCHING user ${userId} (score: ${result.score}):`, result.reasons.map(r => r.description));

            return {
                action: 'watch',
                score: result.score,
                reasons: result.reasons.map(r => r.description)
            };
        }

        return {
            action: 'none',
            score: result.score,
            reasons: []
        };
    }

    /**
     * 批量检测活跃用户
     */
    static async scanActiveUsers(): Promise<void> {
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

        // 获取24小时内活跃的用户
        const activeUserIds = await TransactionLog.collection.distinct('userId', {
            createdAt: { $gte: dayAgo }
        });

        console.log(`[FraudDetection] Scanning ${activeUserIds.length} active users...`);

        let bannedCount = 0;
        let restrictedCount = 0;
        let watchingCount = 0;

        for (const userId of activeUserIds) {
            const result = await this.autoModerate(userId);

            if (result.action === 'ban') bannedCount++;
            else if (result.action === 'restrict') restrictedCount++;
            else if (result.action === 'watch') watchingCount++;
        }

        console.log(`[FraudDetection] Scan complete: ${bannedCount} banned, ${restrictedCount} restricted, ${watchingCount} watching`);
    }
}

/**
 * 定时扫描任务（每10分钟）
 */
export function startFraudDetectionCron() {
    const INTERVAL = 10 * 60 * 1000; // 10分钟

    setInterval(async () => {
        try {
            await FraudDetectionEngine.scanActiveUsers();
        } catch (err) {
            console.error('[FraudDetection] Cron error:', err);
        }
    }, INTERVAL);

    console.log('[FraudDetection] Cron started (interval: 10min)');
}
