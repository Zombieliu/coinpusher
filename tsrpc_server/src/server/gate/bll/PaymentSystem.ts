/**
 * 💳 支付系统
 *
 * 功能：
 * 1. 支付订单创建
 * 2. 支付回调处理
 * 3. 订单查询
 * 4. 退款处理
 * 5. 支付渠道管理
 *
 * 支持渠道：
 * - 微信支付
 * - 支付宝
 * - PayPal
 * - Stripe
 * - 加密货币（Sui）
 */

import { MongoDBService } from '../db/MongoDBService';
import { DragonflyDBService } from '../db/DragonflyDBService';
import { ShopSystem, ProductConfig, CurrencyType } from './ShopSystem';
import { UserDB } from '../data/UserDB';
import crypto from 'crypto';
import { FinanceSecurityGuard } from './FinanceSecurityGuard';
import { AdminRole } from './AdminUserSystem';

/** 支付渠道 */
export enum PaymentChannel {
    Wechat = 'wechat',          // 微信支付
    Alipay = 'alipay',          // 支付宝
    PayPal = 'paypal',          // PayPal
    Stripe = 'stripe',          // Stripe
    Sui = 'sui'                 // Sui链支付
}

/** 订单状态 */
export enum OrderStatus {
    Pending = 'pending',        // 待支付
    Paid = 'paid',              // 已支付
    Delivered = 'delivered',    // 已发货
    Cancelled = 'cancelled',    // 已取消
    Refunded = 'refunded',      // 已退款
    Failed = 'failed'           // 支付失败
}

/** 支付订单 */
export interface PaymentOrder {
    orderId: string;
    userId: string;
    productId: string;
    productName: string;

    // 金额
    amount: number;             // 支付金额
    currency: string;           // 货币类型（CNY, USD等）

    // 支付信息
    channel: PaymentChannel;
    channelOrderId?: string;    // 第三方订单号
    paymentUrl?: string;        // 支付链接

    // 状态
    status: OrderStatus;
    createdAt: number;
    paidAt?: number;
    deliveredAt?: number;
    refundedAt?: number;

    // 回调
    notifyUrl?: string;
    returnUrl?: string;

    // 附加信息
    metadata?: any;
}

/** 支付回调数据 */
export interface PaymentCallback {
    orderId: string;
    channelOrderId: string;
    status: 'success' | 'fail';
    amount: number;
    currency: string;
    paidAt: number;
    rawData?: any;
}

/** 退款申请 */
export interface RefundRequest {
    refundId: string;
    orderId: string;
    userId: string;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: number;
    processedAt?: number;
    processedBy?: string;
    processedByName?: string;
    channelRefundId?: string;
    adminNote?: string;
    evidenceUrls?: string[];
}

export class PaymentSystem {
    /**
     * 创建支付订单
     */
    static async createOrder(
        userId: string,
        productId: string,
        channel: PaymentChannel
    ): Promise<{
        success: boolean;
        error?: string;
        order?: PaymentOrder;
    }> {
        // 获取商品信息
        const product = ShopSystem.getProduct(productId);
        if (!product) {
            return { success: false, error: '商品不存在' };
        }

        // 检查货币类型
        if (product.currency === CurrencyType.Gold) {
            return { success: false, error: '该商品使用金币购买，无需支付' };
        }

        // 生成订单号
        const orderId = this.generateOrderId(userId);

        // 创建订单
        const order: PaymentOrder = {
            orderId,
            userId,
            productId,
            productName: product.name,
            amount: product.price,
            currency: this.convertCurrency(product.currency),
            channel,
            status: OrderStatus.Pending,
            createdAt: Date.now()
        };

        // 保存订单
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        await collection.insertOne(order);

        // 调用支付渠道创建支付
        const paymentResult = await this.initiatePayment(order, channel);

        if (!paymentResult.success) {
            // 更新订单状态为失败
            await collection.updateOne(
                { orderId },
                { $set: { status: OrderStatus.Failed } }
            );
            return { success: false, error: paymentResult.error };
        }

        // 更新订单支付信息
        await collection.updateOne(
            { orderId },
            {
                $set: {
                    channelOrderId: paymentResult.channelOrderId,
                    paymentUrl: paymentResult.paymentUrl
                }
            }
        );

        order.channelOrderId = paymentResult.channelOrderId;
        order.paymentUrl = paymentResult.paymentUrl;

        console.log(`[PaymentSystem] 创建支付订单 ${orderId}，金额 ${order.amount} ${order.currency}`);

        return { success: true, order };
    }

    /**
     * 发起支付（对接第三方支付）
     */
    private static async initiatePayment(
        order: PaymentOrder,
        channel: PaymentChannel
    ): Promise<{
        success: boolean;
        error?: string;
        channelOrderId?: string;
        paymentUrl?: string;
    }> {
        switch (channel) {
            case PaymentChannel.Wechat:
                return await this.initiateWechatPay(order);

            case PaymentChannel.Alipay:
                return await this.initiateAlipay(order);

            case PaymentChannel.PayPal:
                return await this.initiatePayPal(order);

            case PaymentChannel.Stripe:
                return await this.initiateStripe(order);

            case PaymentChannel.Sui:
                return await this.initiateSuiPay(order);

            default:
                return { success: false, error: '不支持的支付渠道' };
        }
    }

    /**
     * 微信支付（示例）
     */
    private static async initiateWechatPay(order: PaymentOrder): Promise<any> {
        // TODO: 对接微信支付API
        // 1. 调用微信统一下单接口
        // 2. 返回支付参数
        return {
            success: true,
            channelOrderId: `wx_${Date.now()}`,
            paymentUrl: `weixin://wxpay/bizpayurl?...`
        };
    }

    /**
     * 发起渠道退款（示例）
     */
    private static async initiateRefundToChannel(
        order: PaymentOrder,
        amount: number
    ): Promise<{ success: boolean; error?: string; transactionId?: string }> {
        switch (order.channel) {
            case PaymentChannel.Wechat:
                return await this.refundWechat(order.orderId, amount);
            case PaymentChannel.Alipay:
                return await this.refundAlipay(order.orderId, amount);
            case PaymentChannel.PayPal:
                return await this.refundPayPal(order.orderId, amount);
            case PaymentChannel.Stripe:
                return await this.refundStripe(order.orderId, amount);
            case PaymentChannel.Sui:
                return await this.refundSui(order.orderId, amount);
            default:
                return { success: false, error: '不支持的支付渠道' };
        }
    }

    private static async refundWechat(orderId: string, amount: number) {
        return {
            success: true,
            transactionId: `wx_ref_${orderId}_${amount}`
        };
    }

    private static async refundAlipay(orderId: string, amount: number) {
        return {
            success: true,
            transactionId: `ali_ref_${orderId}_${amount}`
        };
    }

    private static async refundPayPal(orderId: string, amount: number) {
        return {
            success: true,
            transactionId: `paypal_ref_${orderId}_${amount}`
        };
    }

    private static async refundStripe(orderId: string, amount: number) {
        return {
            success: true,
            transactionId: `stripe_ref_${orderId}_${amount}`
        };
    }

    private static async refundSui(orderId: string, amount: number) {
        return {
            success: true,
            transactionId: `sui_ref_${orderId}_${amount}`
        };
    }

    /**
     * 支付宝支付（示例）
     */
    private static async initiateAlipay(order: PaymentOrder): Promise<any> {
        // TODO: 对接支付宝API
        return {
            success: true,
            channelOrderId: `ali_${Date.now()}`,
            paymentUrl: `https://openapi.alipay.com/gateway.do?...`
        };
    }

    /**
     * PayPal支付（示例）
     */
    private static async initiatePayPal(order: PaymentOrder): Promise<any> {
        // TODO: 对接PayPal API
        return {
            success: true,
            channelOrderId: `paypal_${Date.now()}`,
            paymentUrl: `https://www.paypal.com/checkoutnow?token=...`
        };
    }

    /**
     * Stripe支付（示例）
     */
    private static async initiateStripe(order: PaymentOrder): Promise<any> {
        // TODO: 对接Stripe API
        return {
            success: true,
            channelOrderId: `stripe_${Date.now()}`,
            paymentUrl: `https://checkout.stripe.com/pay/...`
        };
    }

    /**
     * Sui链支付（示例）
     */
    private static async initiateSuiPay(order: PaymentOrder): Promise<any> {
        // TODO: 对接Sui链支付
        return {
            success: true,
            channelOrderId: `sui_${Date.now()}`,
            paymentUrl: `sui://pay?amount=${order.amount}&...`
        };
    }

    /**
     * 处理支付回调
     */
    static async handlePaymentCallback(
        callback: PaymentCallback
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const { orderId, channelOrderId, status, amount, paidAt } = callback;

        // 查找订单
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const order = await collection.findOne({ orderId });

        if (!order) {
            return { success: false, error: '订单不存在' };
        }

        // 检查订单状态
        if (order.status !== OrderStatus.Pending) {
            return { success: false, error: '订单状态异常' };
        }

        // 验证金额
        if (Math.abs(order.amount - amount) > 0.01) {
            console.error(`[PaymentSystem] 订单金额不匹配：${order.amount} vs ${amount}`);
            return { success: false, error: '订单金额不匹配' };
        }

        if (status === 'success') {
            // 更新订单状态
            await collection.updateOne(
                { orderId },
                {
                    $set: {
                        status: OrderStatus.Paid,
                        paidAt,
                        channelOrderId
                    }
                }
            );

            // 发货
            await this.deliverOrder(order);

            console.log(`[PaymentSystem] 订单 ${orderId} 支付成功，已发货`);

            return { success: true };
        } else {
            // 支付失败
            await collection.updateOne(
                { orderId },
                { $set: { status: OrderStatus.Failed } }
            );

            console.log(`[PaymentSystem] 订单 ${orderId} 支付失败`);

            return { success: false, error: '支付失败' };
        }
    }

    /**
     * 发货
     */
    private static async deliverOrder(order: PaymentOrder): Promise<void> {
        await this.applyOrderRewards(order);

        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        await collection.updateOne(
            { orderId: order.orderId },
            {
                $set: {
                    status: OrderStatus.Delivered,
                    deliveredAt: Date.now()
                }
            }
        );

        console.log(`[PaymentSystem] 订单 ${order.orderId} 发货完成`);
    }

    private static async applyOrderRewards(order: PaymentOrder): Promise<void> {
        const product = ShopSystem.getProduct(order.productId);
        if (!product) {
            console.error(`[PaymentSystem] 商品不存在：${order.productId}`);
            return;
        }

        // 使用商城系统发货（内部购买，不扣金币）
        // 这里需要直接调用发货逻辑
        const content = product.content;

        // 发放道具
        if (content.items) {
            const { ItemSystem } = await import('./ItemSystem');
            for (const item of content.items) {
                await ItemSystem.addItem(order.userId, item.itemId, item.quantity);
            }
        }

        // 发放金币
        if (content.goldAmount) {
            const user = await UserDB.getUserById(order.userId);
            if (user) {
                const totalGold = content.goldAmount + (content.bonusGold || 0);
                await UserDB.updateUser(order.userId, {
                    gold: user.gold + totalGold
                });
            }
        }

        // 发放彩票
        if (content.ticketAmount) {
            const totalTickets = content.ticketAmount + (content.bonusTickets || 0);
            await UserDB.addTickets(order.userId, totalTickets);
        }

    }

    /**
     * 查询订单
     */
    static async getOrder(orderId: string): Promise<PaymentOrder | null> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        return await collection.findOne({ orderId });
    }

    /**
     * 获取用户订单列表
     */
    static async getUserOrders(
        userId: string,
        limit: number = 50
    ): Promise<PaymentOrder[]> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        return await collection
            .find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 取消订单
     */
    static async cancelOrder(orderId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const order = await collection.findOne({ orderId });

        if (!order) {
            return { success: false, error: '订单不存在' };
        }

        if (order.status !== OrderStatus.Pending) {
            return { success: false, error: '只能取消待支付订单' };
        }

        await collection.updateOne(
            { orderId },
            { $set: { status: OrderStatus.Cancelled } }
        );

        console.log(`[PaymentSystem] 订单 ${orderId} 已取消`);

        return { success: true };
    }

    /**
     * 申请退款
     */
    static async requestRefund(
        orderId: string,
        reason: string
    ): Promise<{
        success: boolean;
        error?: string;
        refundId?: string;
    }> {
        const orderCollection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const order = await orderCollection.findOne({ orderId });

        if (!order) {
            return { success: false, error: '订单不存在' };
        }

        if (order.status !== OrderStatus.Paid && order.status !== OrderStatus.Delivered) {
            return { success: false, error: '该订单不支持退款' };
        }

        // 创建退款申请
        const refundId = `refund_${Date.now()}_${orderId}`;
        const refund: RefundRequest = {
            refundId,
            orderId,
            userId: order.userId,
            amount: order.amount,
            reason,
            status: 'pending',
            createdAt: Date.now()
        };

        const refundCollection = MongoDBService.getCollection<RefundRequest>('refund_requests');
        await refundCollection.insertOne(refund);

        console.log(`[PaymentSystem] 创建退款申请 ${refundId}，订单 ${orderId}`);

        return { success: true, refundId };
    }

    /**
     * 处理退款（管理员操作）
     */
    static async processRefund(
        refundId: string,
        approved: boolean,
        options?: { adminId?: string; adminName?: string; adminRole?: AdminRole; note?: string }
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        const refundCollection = MongoDBService.getCollection<RefundRequest>('refund_requests');
        const refund = await refundCollection.findOne({ refundId });

        if (!refund) {
            return { success: false, error: '退款申请不存在' };
        }

        if (refund.status !== 'pending') {
            return { success: false, error: '该退款申请已处理' };
        }

        const now = Date.now();
        const orderCollection = MongoDBService.getCollection<PaymentOrder>('payment_orders');

        if (approved) {
            const order = await orderCollection.findOne({ orderId: refund.orderId });
            if (!order) {
                return { success: false, error: '关联订单不存在' };
            }

            if (order.status !== OrderStatus.Paid && order.status !== OrderStatus.Delivered) {
                return { success: false, error: '该订单状态不可退款' };
            }
            if (options?.adminId && options.adminRole) {
                await FinanceSecurityGuard.ensureRefundActionAllowed({
                    adminId: options.adminId,
                    adminRole: options.adminRole,
                    adminName: options.adminName,
                    amount: refund.amount,
                    refundId,
                    approved: true
                });
            }

            const channelResult = await this.initiateRefundToChannel(order, refund.amount);
            if (!channelResult.success) {
                return { success: false, error: channelResult.error || '支付渠道退款失败' };
            }

            await refundCollection.updateOne(
                { refundId },
                {
                    $set: {
                        status: 'completed',
                        processedAt: now,
                        processedBy: options?.adminId,
                        processedByName: options?.adminName,
                        channelRefundId: channelResult.transactionId,
                        adminNote: options?.note
                    }
                }
            );

            await orderCollection.updateOne(
                { orderId: refund.orderId },
                {
                    $set: {
                        status: OrderStatus.Refunded,
                        refundedAt: now
                    }
                }
            );

            console.log(`[PaymentSystem] 退款 ${refundId} 已完成，渠道流水 ${channelResult.transactionId}`);
        } else {
            // 拒绝退款
            await refundCollection.updateOne(
                { refundId },
                {
                    $set: {
                        status: 'rejected',
                        processedAt: now,
                        processedBy: options?.adminId,
                        processedByName: options?.adminName,
                        adminNote: options?.note
                    }
                }
            );

            console.log(`[PaymentSystem] 退款 ${refundId} 已拒绝`);
        }

        return { success: true };
    }

    /**
     * 生成订单号
     */
    private static generateOrderId(userId: string): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const hash = crypto.createHash('md5')
            .update(`${userId}_${timestamp}_${random}`)
            .digest('hex')
            .substring(0, 8);
        return `order_${timestamp}_${hash}`;
    }

    /**
     * 转换货币类型
     */
    private static convertCurrency(currency: CurrencyType): string {
        const mapping: Record<CurrencyType, string> = {
            [CurrencyType.Gold]: 'GOLD',
            [CurrencyType.RMB]: 'CNY',
            [CurrencyType.USD]: 'USD'
        };
        return mapping[currency] || 'CNY';
    }

    /**
     * 获取支付统计
     */
    static async getPaymentStats(userId?: string): Promise<{
        totalOrders: number;
        totalRevenue: number;
        successRate: number;
        avgOrderValue: number;
    }> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');

        const query: any = userId ? { userId } : {};

        const totalOrders = await collection.countDocuments(query);
        const successOrders = await collection.countDocuments({
            ...query,
            status: { $in: [OrderStatus.Paid, OrderStatus.Delivered] }
        });

        const pipeline = [
            { $match: { ...query, status: { $in: [OrderStatus.Paid, OrderStatus.Delivered] } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    avgOrderValue: { $avg: '$amount' }
                }
            }
        ];

        const result = await collection.aggregate(pipeline).toArray();
        const stats = result[0] || { totalRevenue: 0, avgOrderValue: 0 };

        return {
            totalOrders,
            totalRevenue: stats.totalRevenue,
            successRate: totalOrders > 0 ? (successOrders / totalOrders) * 100 : 0,
            avgOrderValue: stats.avgOrderValue
        };
    }

    /**
     * 获取所有订单（管理员）
     */
    static async getOrders(
        query: {
            userId?: string;
            status?: OrderStatus;
            orderId?: string;
            startDate?: number;
            endDate?: number;
        },
        page: number = 1,
        limit: number = 20
    ): Promise<{
        orders: PaymentOrder[];
        total: number;
    }> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const dbQuery: any = {};

        if (query.userId) dbQuery.userId = query.userId;
        if (query.status) dbQuery.status = query.status;
        if (query.orderId) dbQuery.orderId = { $regex: query.orderId, $options: 'i' };
        
        if (query.startDate || query.endDate) {
            dbQuery.createdAt = {};
            if (query.startDate) dbQuery.createdAt.$gte = query.startDate;
            if (query.endDate) dbQuery.createdAt.$lte = query.endDate;
        }

        const total = await collection.countDocuments(dbQuery);
        const orders = await collection
            .find(dbQuery)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        return { orders, total };
    }

    /**
     * 管理员更新订单状态
     */
    static async updateOrderStatus(
        orderId: string,
        status: OrderStatus,
        context?: { adminId?: string; adminRole?: AdminRole; adminName?: string }
    ): Promise<{ success: boolean; error?: string }> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const order = await collection.findOne({ orderId });
        if (!order) {
            return { success: false, error: '订单不存在' };
        }

        if (!Object.values(OrderStatus).includes(status)) {
            return { success: false, error: '无效的订单状态' };
        }

        if (order.status === status) {
            return { success: true };
        }

        if (context?.adminId && context.adminRole) {
            await FinanceSecurityGuard.ensureOrderActionAllowed('admin/UpdateOrderStatus', {
                adminId: context.adminId,
                adminRole: context.adminRole,
                adminName: context.adminName,
                amount: order.amount,
                orderId: order.orderId,
            });
        }

        const updates: any = {
            status,
            updatedAt: Date.now()
        };

        if (status === OrderStatus.Paid && !order.paidAt) {
            updates.paidAt = Date.now();
        }

        if (status === OrderStatus.Delivered && !order.deliveredAt) {
            updates.deliveredAt = Date.now();
        }

        await collection.updateOne({ orderId }, { $set: updates });
        console.log(`[PaymentSystem] 管理员更新订单 ${orderId} 状态为 ${status}`);

        return { success: true };
    }

    static async manualDeliverOrder(
        orderId: string,
        context?: { adminId?: string; adminRole?: AdminRole; adminName?: string }
    ): Promise<{ success: boolean; error?: string }> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const order = await collection.findOne({ orderId });
        if (!order) {
            return { success: false, error: '订单不存在' };
        }

        if (order.status !== OrderStatus.Paid) {
            return { success: false, error: '仅已支付订单可标记发货' };
        }

        if (context?.adminId && context.adminRole) {
            await FinanceSecurityGuard.ensureOrderActionAllowed('admin/DeliverOrder', {
                adminId: context.adminId,
                adminRole: context.adminRole,
                adminName: context.adminName,
                amount: order.amount,
                orderId: order.orderId,
            });
        }

        await this.applyOrderRewards(order);
        await collection.updateOne(
            { orderId },
            {
                $set: {
                    status: OrderStatus.Delivered,
                    deliveredAt: Date.now()
                }
            }
        );

        console.log(`[PaymentSystem] 管理员手动发货订单 ${orderId}`);
        return { success: true };
    }

    static async resendOrderRewards(
        orderId: string,
        context?: { adminId?: string; adminRole?: AdminRole; adminName?: string }
    ): Promise<{ success: boolean; error?: string }> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const order = await collection.findOne({ orderId });
        if (!order) {
            return { success: false, error: '订单不存在' };
        }

        if (order.status !== OrderStatus.Delivered) {
            return { success: false, error: '仅已发货订单可重发奖励' };
        }

        if (context?.adminId && context.adminRole) {
            await FinanceSecurityGuard.ensureOrderActionAllowed('admin/ResendOrderReward', {
                adminId: context.adminId,
                adminRole: context.adminRole,
                adminName: context.adminName,
                amount: order.amount,
                orderId: order.orderId,
            });
        }

        await this.applyOrderRewards(order);
        console.log(`[PaymentSystem] 管理员重发了订单 ${orderId} 的奖励`);
        return { success: true };
    }

    /**
     * 获取财务统计详情（管理员）
     */
    static async getFinancialStatsDetailed(
        startDate: number,
        endDate: number
    ): Promise<{
        dailyRevenue: { date: string; revenue: number; orders: number }[];
        totalRevenue: number;
        totalOrders: number;
        avgOrderValue: number;
        topSpenders: { userId: string; total: number }[];
    }> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        
        const match = {
            status: { $in: [OrderStatus.Paid, OrderStatus.Delivered] },
            createdAt: { $gte: startDate, $lte: endDate }
        };

        // 每日营收
        const dailyPipeline = [
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$createdAt" } } },
                    revenue: { $sum: "$amount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } as any }
        ];

        // 总体统计
        const totalPipeline = [
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount" },
                    totalOrders: { $sum: 1 },
                    avgOrderValue: { $avg: "$amount" }
                }
            }
        ];

        // 大R用户
        const topSpendersPipeline = [
            { $match: match },
            {
                $group: {
                    _id: "$userId",
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { total: -1 } as any },
            { $limit: 10 }
        ];

        const [dailyResult, totalResult, topSpendersResult] = await Promise.all([
            collection.aggregate(dailyPipeline).toArray(),
            collection.aggregate(totalPipeline).toArray(),
            collection.aggregate(topSpendersPipeline).toArray()
        ]);

        const totalStats = totalResult[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

        return {
            dailyRevenue: dailyResult.map(r => ({ date: r._id, revenue: r.revenue, orders: r.orders })),
            totalRevenue: totalStats.totalRevenue,
            totalOrders: totalStats.totalOrders,
            avgOrderValue: totalStats.avgOrderValue,
            topSpenders: topSpendersResult.map(r => ({ userId: r._id, total: r.total }))
        };
    }

    /**
     * 获取退款申请列表（管理员）
     */
    static async getRefundRequests(
        status?: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{
        refunds: RefundRequest[];
        total: number;
    }> {
        const collection = MongoDBService.getCollection<RefundRequest>('refund_requests');
        const query: any = {};
        
        if (status) query.status = status;

        const total = await collection.countDocuments(query);
        const refunds = await collection
            .find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        return { refunds, total };
    }
}
