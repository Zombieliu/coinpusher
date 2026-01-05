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
import Stripe from 'stripe';
import { FinanceSecurityGuard } from './FinanceSecurityGuard';
import { AdminRole, AdminUserSystem } from './AdminUserSystem';
import { FxService } from '../utils/FxService';

/** 支付渠道 */
export enum PaymentChannel {
    Wechat = 'wechat',          // 微信支付
    Alipay = 'alipay',          // 支付宝
    PayPal = 'paypal',          // PayPal
    Stripe = 'stripe',          // Stripe
    Sui = 'sui'                 // Sui链支付
}

const ERR_CHANNEL_DISABLED = 'channel_disabled';
const ERR_CHANNEL_UNIMPLEMENTED = 'channel_unimplemented';
const ERR_PRODUCT_NOT_FOUND = 'product_not_found';
const ERR_GOLD_PRODUCT = 'gold_product_no_payment';

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
    /** Stripe 客户端（懒加载） */
    private static stripeClient: Stripe | null = null;
    /** Stripe Webhook 签名秘钥 */
    private static stripeWebhookSecret: string | null = process.env.STRIPE_WEBHOOK_SECRET || null;
    /** 汇率缓存（简单内存）；默认汇率可在启动时刷新 */
    private static fxRates: Record<string, number> = { USD: 1, CNY: 7.1, EUR: 0.92 }; // 2026-01 的近似值，建议启动时刷新
    private static fxBase = 'USD';
    /** 渠道开关 */
    private static isChannelEnabled(channel: PaymentChannel): boolean {
        const envName = `PAYMENT_${channel.toUpperCase()}_ENABLED`;
        const val = process.env[envName];
        if (val === '0' || val === 'false') return false;
        if (channel === PaymentChannel.Stripe) return true; // 默认开启 Stripe
        // 其他渠道默认关闭，需显式打开
        return val === '1' || val === 'true';
    }

    /** 更新汇率（外部可调用） */
    static setFxRates(rates: Record<string, number>, base: string = 'USD') {
        this.fxRates = rates;
        this.fxBase = base.toUpperCase();
    }
    /** 启动时校验配置 */
    static validateStripeConfig() {
        if (!this.isChannelEnabled(PaymentChannel.Stripe)) {
            console.warn('[PaymentSystem] Stripe 已关闭（PAYMENT_STRIPE_ENABLED=0），跳过配置校验');
            return;
        }
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY 未配置，Stripe 功能不可用');
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.warn('[PaymentSystem] STRIPE_WEBHOOK_SECRET 未配置，Webhook 签名将无法校验');
        }
        // 启动时刷新汇率（最好带缓存/容错）
        const base = process.env.FX_BASE || 'USD';
        const symbols = (process.env.FX_SYMBOLS || 'USD,CNY,EUR').split(',').map(s => s.trim()).filter(Boolean);
        FxService.fetchLatest(base, symbols).then(rates => {
            if (rates && Object.keys(rates).length) {
                PaymentSystem.setFxRates(rates, base);
                console.log(`[PaymentSystem] FX rates updated: base=${base}`, rates);
            } else {
                console.warn('[PaymentSystem] FX rates fetch failed，继续使用默认汇率');
            }
        });
    }

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
        // 渠道开关
        if (!this.isChannelEnabled(channel)) {
            return { success: false, error: ERR_CHANNEL_DISABLED };
        }
        // 获取商品信息
        const product = ShopSystem.getProduct(productId);
        if (!product) {
            return { success: false, error: ERR_PRODUCT_NOT_FOUND };
        }

        // 金币按汇率折算为 USD，默认 1 USD = 100 Gold，可通过 GOLD_PER_USD 覆盖
        let priceAmount = product.price;
        let priceCurrency = this.convertCurrency(product.currency);
        if (product.currency === CurrencyType.Gold) {
            const goldPerUsd = Number(process.env.GOLD_PER_USD || '100');
            const usdAmount = priceAmount / goldPerUsd;
            priceAmount = Math.max(usdAmount, 0.01); // Stripe 最小 0.5 USD，先保底0.01，后续可再校验
            priceCurrency = 'USD';
        }

        // 生成订单号
        const orderId = this.generateOrderId(userId);

        // 创建订单
        const order: PaymentOrder = {
            orderId,
            userId,
            productId,
            productName: product.name,
            amount: priceAmount,
            currency: priceCurrency,
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
        if (!this.isChannelEnabled(PaymentChannel.Wechat)) {
            return { success: false, error: ERR_CHANNEL_DISABLED };
        }
        return { success: false, error: ERR_CHANNEL_UNIMPLEMENTED };
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
        const stripe = this.getStripeClient();
        if (!stripe) {
            return { success: false, error: 'Stripe 未配置' };
        }

        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const order = await collection.findOne({ orderId });
        if (!order || !order.channelOrderId) {
            return { success: false, error: '订单不存在或缺少支付流水' };
        }

        try {
            const refund = await stripe.refunds.create({
                payment_intent: order.channelOrderId,
                amount: Math.round(amount * 100)
            });

            // 回退发货（尽力而为，资源不足时记录警告但不阻断退款）
            await this.reverseOrderRewards(order);

            await collection.updateOne(
                { orderId },
                {
                    $set: {
                        status: OrderStatus.Refunded,
                        refundedAt: Date.now(),
                        channelOrderId: order.channelOrderId,
                        metadata: {
                            ...(order.metadata || {}),
                            lastRefundId: refund.id
                        }
                    }
                }
            );

            await this.logStripeEvent('refund.created', {
                orderId,
                refundId: refund.id,
                intentId: order.channelOrderId
            });

            await AdminUserSystem.logAdminAction('system', 'payment_stripe_refund', {
                orderId,
                userId: order.userId,
                amount,
                currency: order.currency,
                refundId: refund.id,
                intentId: order.channelOrderId
            });

            return {
                success: true,
                transactionId: refund.id
            };
        } catch (err: any) {
            console.error('[PaymentSystem] Stripe 退款失败:', err?.message || err);
            return { success: false, error: 'Stripe 退款失败' };
        }
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
        if (!this.isChannelEnabled(PaymentChannel.Alipay)) {
            return { success: false, error: ERR_CHANNEL_DISABLED };
        }
        return { success: false, error: ERR_CHANNEL_UNIMPLEMENTED };
    }

    /**
     * PayPal支付（示例）
     */
    private static async initiatePayPal(order: PaymentOrder): Promise<any> {
        if (!this.isChannelEnabled(PaymentChannel.PayPal)) {
            return { success: false, error: ERR_CHANNEL_DISABLED };
        }
        return { success: false, error: ERR_CHANNEL_UNIMPLEMENTED };
    }

    /**
     * Stripe支付（示例）
     */
    private static async initiateStripe(order: PaymentOrder): Promise<any> {
        const stripe = this.getStripeClient();
        if (!stripe) {
            return { success: false, error: 'Stripe 未配置，请设置 STRIPE_SECRET_KEY' };
        }

        // 以分为单位
        const amountInMinorUnit = Math.round(order.amount * 100);

        // 构造回调 URL（占位符 {CHECKOUT_SESSION_ID} 会被 Stripe 替换）
        const { successUrl, cancelUrl } = this.buildStripeUrls(order);

        try {
            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                client_reference_id: order.orderId,
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    orderId: order.orderId,
                    userId: order.userId,
                    productId: order.productId
                },
                line_items: [
                    {
                        quantity: 1,
                        price_data: {
                            currency: order.currency.toLowerCase(),
                            unit_amount: amountInMinorUnit,
                            product_data: {
                                name: order.productName
                            }
                        }
                    }
                ]
            });

            if (!session.url) {
                return { success: false, error: 'Stripe 会话创建失败，缺少支付链接' };
            }

            return {
                success: true,
                channelOrderId: session.id,
                paymentUrl: session.url
            };
        } catch (error: any) {
            console.error('[PaymentSystem] 创建 Stripe 会话失败:', error?.message || error);
            return { success: false, error: 'Stripe 创建支付失败' };
        }
    }

    /**
     * 客户端支付成功后，服务器侧确认 Stripe 会话并发货
     */
    static async confirmStripePayment(sessionId: string, orderId?: string): Promise<{
        success: boolean;
        error?: string;
        order?: PaymentOrder;
    }> {
        const stripe = this.getStripeClient();
        if (!stripe) {
            return { success: false, error: 'Stripe 未配置，请设置 STRIPE_SECRET_KEY' };
        }

        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['payment_intent']
            });

            const targetOrderId =
                session.metadata?.orderId ||
                session.client_reference_id ||
                orderId;

            if (!targetOrderId) {
                return { success: false, error: '订单号缺失' };
            }

            const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
            const order = await collection.findOne({ orderId: targetOrderId });

            if (!order) {
                return { success: false, error: '订单不存在' };
            }

            // 判断支付状态
            const isPaid =
                session.payment_status === 'paid' ||
                session.status === 'complete';

            const channelIntentId = typeof session.payment_intent === 'string'
                ? session.payment_intent
                : (session.payment_intent?.id || session.id);

            if (!isPaid) {
                return { success: false, error: '支付未完成', order };
            }

            // 校验金额（若 Stripe 返回了金额）
            const amountTotal = session.amount_total ?? (session.payment_intent && typeof (session.payment_intent as any).amount_received === 'number'
                ? (session.payment_intent as any).amount_received
                : undefined);

            const expected = Math.round(order.amount * 100);
            if (amountTotal !== undefined && Math.abs(amountTotal - expected) > 1) {
                return { success: false, error: '支付金额不匹配', order };
            }

            // 如果已处理过，直接返回
            if (order.status === OrderStatus.Delivered || order.status === OrderStatus.Paid) {
                return { success: true, order };
            }

            // 更新订单状态并发货
            await collection.updateOne(
                { orderId: targetOrderId },
                {
                    $set: {
                        status: OrderStatus.Paid,
                        paidAt: Date.now(),
                        channelOrderId: channelIntentId
                    }
                }
            );

            const updatedOrder = {
                ...order,
                status: OrderStatus.Paid,
                paidAt: Date.now(),
                channelOrderId: channelIntentId
            };

            await this.deliverOrder(updatedOrder);

            const finalOrder = await collection.findOne({ orderId: targetOrderId });

            return { success: true, order: finalOrder || updatedOrder };
        } catch (error: any) {
            console.error('[PaymentSystem] 确认 Stripe 支付失败:', error?.message || error);
            return { success: false, error: 'Stripe 确认支付失败' };
        }
    }

    /**
     * 确认 PaymentIntent（用于 webhook 场景）
     */
    static async confirmStripeIntent(intentId: string): Promise<{ success: boolean; error?: string; order?: PaymentOrder }> {
        const stripe = this.getStripeClient();
        if (!stripe) {
            return { success: false, error: 'Stripe 未配置，请设置 STRIPE_SECRET_KEY' };
        }

        try {
            const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] });
            const targetOrderId = (intent.metadata as any)?.orderId || intent.client_reference_id;
            if (!targetOrderId) {
                return { success: false, error: '订单号缺失' };
            }

            const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
            const order = await collection.findOne({ orderId: targetOrderId });
            if (!order) {
                return { success: false, error: '订单不存在' };
            }

            const amountReceived = intent.amount_received ?? intent.amount ?? 0;
            const expected = Math.round(order.amount * 100);
            if (amountReceived && Math.abs(amountReceived - expected) > 1) {
                return { success: false, error: '支付金额不匹配', order };
            }

            if (order.status === OrderStatus.Delivered || order.status === OrderStatus.Paid) {
                return { success: true, order };
            }

            const channelIntentId = intent.id;
            await collection.updateOne(
                { orderId: targetOrderId },
                {
                    $set: {
                        status: OrderStatus.Paid,
                        paidAt: Date.now(),
                        channelOrderId: channelIntentId
                    }
                }
            );

            const updatedOrder = {
                ...order,
                status: OrderStatus.Paid,
                paidAt: Date.now(),
                channelOrderId: channelIntentId
            };

            await this.deliverOrder(updatedOrder);
            const finalOrder = await collection.findOne({ orderId: targetOrderId });

            await this.logStripeEvent('payment_intent.succeeded', {
                orderId: targetOrderId,
                intentId: channelIntentId,
                verified: true
            });

            await AdminUserSystem.logAdminAction('system', 'payment_stripe_succeeded', {
                orderId: targetOrderId,
                userId: order.userId,
                amount: order.amount,
                currency: order.currency,
                intentId: channelIntentId
            });

            return { success: true, order: finalOrder || updatedOrder };
        } catch (err: any) {
            console.error('[PaymentSystem] 确认 PaymentIntent 失败:', err?.message || err);
            return { success: false, error: 'Stripe 确认支付失败' };
        }
    }

    /**
     * 创建 Stripe 客户端（惰性）
     */
    private static getStripeClient(): Stripe | null {
        if (this.stripeClient) {
            return this.stripeClient;
        }
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            console.warn('[PaymentSystem] STRIPE_SECRET_KEY 未配置，无法使用 Stripe');
            return null;
        }
        this.stripeClient = new Stripe(secretKey, {
            apiVersion: '2023-10-16'
        });
        return this.stripeClient;
    }

    /**
     * 处理 Stripe Webhook 事件
     */
    static async handleStripeWebhook(rawBody: string, signature?: string): Promise<{ success: boolean; error?: string }> {
        const stripe = this.getStripeClient();
        if (!stripe) {
            return { success: false, error: 'Stripe 未配置' };
        }

        let event: Stripe.Event;
        let verified = false;

        if (rawBody && signature && this.stripeWebhookSecret) {
            try {
                event = stripe.webhooks.constructEvent(rawBody, signature, this.stripeWebhookSecret);
                verified = true;
            } catch (err: any) {
                console.error('[PaymentSystem] Stripe webhook 签名校验失败:', err?.message || err);
                return { success: false, error: '签名校验失败' };
            }
        } else {
            try {
                event = JSON.parse(rawBody);
            } catch (err: any) {
                return { success: false, error: '无效的 webhook payload' };
            }
        }

        const type = event.type;
        const eventId = event.id;

        // 幂等：若事件已处理则直接返回
        if (eventId) {
            const processed = await this.isStripeEventProcessed(eventId);
            if (processed) {
                return { success: true };
            }
        }

        if (type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const sessionId = session.id;
            const res = await this.confirmStripePayment(sessionId, session.metadata?.orderId);
            await this.logStripeEvent(type, { sessionId, orderId: session.metadata?.orderId, verified, eventId });
            return res;
        }

        if (type === 'payment_intent.succeeded') {
            const intent = event.data.object as Stripe.PaymentIntent;
            const res = await this.confirmStripeIntent(intent.id);
            await this.logStripeEvent(type, { intentId: intent.id, orderId: intent.metadata?.orderId, verified, eventId });
            return res;
        }

        if (type === 'charge.refunded' || type === 'charge.refund.updated') {
            const charge: any = event.data.object;
            const intentId = charge.payment_intent;
            const refundId = charge?.refunds?.data?.[0]?.id;
            if (intentId) {
                await this.markOrderRefundedByIntent(intentId, refundId);
            }
            await this.logStripeEvent(type, { chargeId: charge.id, intentId, refundId, verified, eventId });
            return { success: true };
        }

        await this.logStripeEvent(type, { verified, eventId });
        return { success: true };
    }

    private static async isStripeEventProcessed(eventId: string): Promise<boolean> {
        const collection = MongoDBService.getCollection('payment_events');
        const exists = await collection.findOne({ eventId });
        return !!exists;
    }

    private static async markOrderRefundedByIntent(intentId: string, refundId?: string) {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const order = await collection.findOne({ channelOrderId: intentId });
        if (!order) return;

        await this.reverseOrderRewards(order);

        await collection.updateOne(
            { orderId: order.orderId },
            {
                $set: {
                    status: OrderStatus.Refunded,
                    refundedAt: Date.now(),
                    metadata: {
                        ...(order.metadata || {}),
                        lastRefundId: refundId || order.metadata?.lastRefundId
                    }
                }
            }
        );
    }

    /**
     * 构建 Stripe 成功 / 取消回调 URL
     */
    private static buildStripeUrls(order: PaymentOrder): { successUrl: string; cancelUrl: string } {
        // 使用根路径 + query，避免 Stripe 禁止 fragment，同时静态服也能返回 index.html
        const defaultBase = 'http://localhost:7457/';
        const defaultSuccess = `${defaultBase}?orderId={ORDER_ID}&sessionId={CHECKOUT_SESSION_ID}&userId={USER_ID}&stripe-success=1`;
        const defaultCancel = `${defaultBase}?orderId={ORDER_ID}&userId={USER_ID}&stripe-cancel=1`;

        const successTemplate = process.env.STRIPE_SUCCESS_URL || defaultSuccess;
        const cancelTemplate = process.env.STRIPE_CANCEL_URL || defaultCancel;

        return {
            successUrl: successTemplate
                .replace('{ORDER_ID}', encodeURIComponent(order.orderId))
                .replace('{USER_ID}', encodeURIComponent(order.userId))
                // Stripe 会自动替换该占位符
                .replace('{CHECKOUT_SESSION_ID}', '{CHECKOUT_SESSION_ID}'),
            cancelUrl: cancelTemplate
                .replace('{ORDER_ID}', encodeURIComponent(order.orderId))
                .replace('{USER_ID}', encodeURIComponent(order.userId))
        };
    }

    /**
     * Sui链支付（示例）
     */
    private static async initiateSuiPay(order: PaymentOrder): Promise<any> {
        if (!this.isChannelEnabled(PaymentChannel.Sui)) {
            return { success: false, error: ERR_CHANNEL_DISABLED };
        }
        return { success: false, error: ERR_CHANNEL_UNIMPLEMENTED };
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
     * 尝试回退发货（用于退款/争议）
     * 金币/彩票可回退；道具尝试扣除；皮肤、VIP 等不可逆奖励仅记录警告。
     */
    private static async reverseOrderRewards(order: PaymentOrder): Promise<void> {
        const product = ShopSystem.getProduct(order.productId);
        if (!product) {
            console.error(`[PaymentSystem] 回退失败，商品不存在：${order.productId}`);
            return;
        }
        const content = product.content;

        // 回退金币
        if (content.goldAmount) {
            const totalGold = content.goldAmount + (content.bonusGold || 0);
            const res = await UserDB.deductGold(order.userId, totalGold);
            if (!res.success) {
                console.warn(`[PaymentSystem] 回退金币失败，余额不足 user=${order.userId} need=${totalGold} current=${res.currentGold}`);
            }
        }

        // 回退彩票
        if (content.ticketAmount) {
            const totalTickets = content.ticketAmount + (content.bonusTickets || 0);
            const ok = await UserDB.consumeTickets(order.userId, totalTickets);
            if (!ok) {
                console.warn(`[PaymentSystem] 回退彩票失败，余额不足 user=${order.userId} need=${totalTickets}`);
            }
        }

        // 回退道具（尽力而为）
        if (content.items && content.items.length > 0) {
            const { ItemSystem } = await import('./ItemSystem');
            for (const item of content.items) {
                const res = await ItemSystem.consumeItem(order.userId, item.itemId, item.quantity);
                if (!res.success) {
                    // 若消费失败，尝试全量清零，避免留下可疑道具
                    const zero = await ItemSystem.consumeItem(order.userId, item.itemId, Number.MAX_SAFE_INTEGER);
                    console.warn(`[PaymentSystem] 回退道具失败 user=${order.userId} item=${item.itemId} qty=${item.quantity}: ${res.error}; force-clear=${zero.success}`);
                }
            }
        }

        // 皮肤 / VIP / 赛季通行证 暂不回退，记录日志
        if (content.skinId || (content.skins && content.skins.length > 0) || content.vipLevel || content.vipDays || content.vipDuration || content.seasonId) {
            console.warn(`[PaymentSystem] 存在不可逆奖励（皮肤/VIP/Season），未自动回退 order=${order.orderId}`);
        }
    }

    /**
     * 从 Stripe Intent 补单（用于对账缺失订单）
     */
    static async recoverOrderFromStripeIntent(intent: Stripe.PaymentIntent): Promise<{ success: boolean; error?: string; order?: PaymentOrder }> {
        const meta: any = intent.metadata || {};
        const userId = meta.userId;
        const productId = meta.productId;
        if (!userId || !productId) {
            return { success: false, error: '缺少 userId 或 productId 元数据，无法补单' };
        }

        const product = ShopSystem.getProduct(productId);
        if (!product) {
            return { success: false, error: '商品不存在' };
        }

        const amountMinor = intent.amount_received ?? intent.amount ?? 0;
        const amount = amountMinor / 100;
        if (Math.abs(amount - product.price) > 0.01) {
            return { success: false, error: '金额与商品价格不匹配，终止补单' };
        }

        const orderId = meta.orderId || `recover_${intent.id}`;
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');
        const existing = await collection.findOne({ orderId });
        if (existing) {
            return { success: true, order: existing };
        }

        const order: PaymentOrder = {
            orderId,
            userId,
            productId,
            productName: product.name,
            amount,
            currency: (intent.currency || this.convertCurrency(product.currency)).toUpperCase(),
            channel: PaymentChannel.Stripe,
            channelOrderId: intent.id,
            status: OrderStatus.Paid,
            createdAt: Date.now(),
            paidAt: intent.created ? intent.created * 1000 : Date.now()
        };

        await collection.insertOne(order);

        // 发货并更新为 Delivered
        await this.deliverOrder(order);
        const finalOrder = await collection.findOne({ orderId });

        await this.logStripeEvent('recovered.intent', { intentId: intent.id, orderId });
        await AdminUserSystem.logAdminAction('system', 'payment_stripe_recover', {
            orderId,
            userId,
            amount,
            currency: order.currency,
            intentId: intent.id
        });

        return { success: true, order: finalOrder || order };
    }

    /**
     * 尝试回退发货（用于退款/争议）
     * 仅对金币、彩票做回退；物品/皮肤类暂不回退（记录警告）
     */
    private static async reverseOrderRewards(order: PaymentOrder): Promise<void> {
        const product = ShopSystem.getProduct(order.productId);
        if (!product) {
            console.error(`[PaymentSystem] 回退失败，商品不存在：${order.productId}`);
            return;
        }
        const content = product.content;

        // 回退金币
        if (content.goldAmount) {
            const totalGold = content.goldAmount + (content.bonusGold || 0);
            const res = await UserDB.deductGold(order.userId, totalGold);
            if (!res.success) {
                console.warn(`[PaymentSystem] 回退金币失败，余额不足 user=${order.userId} need=${totalGold} current=${res.currentGold}`);
            }
        }

        // 回退彩票
        if (content.ticketAmount) {
            const totalTickets = content.ticketAmount + (content.bonusTickets || 0);
            const ok = await UserDB.consumeTickets(order.userId, totalTickets);
            if (!ok) {
                console.warn(`[PaymentSystem] 回退彩票失败，余额不足 user=${order.userId} need=${totalTickets}`);
            }
        }

        // 回退皮肤（仅当拥有时移除）
        if (content.skins && content.skins.length > 0) {
            const { SkinSystem } = await import('./SkinSystem');
            for (const skinId of content.skins) {
                const res = await SkinSystem.removeSkin(order.userId, skinId);
                if (!res.success) {
                    console.warn(`[PaymentSystem] 回退皮肤失败 user=${order.userId} skin=${skinId}: ${res.error}`);
                }
            }
        }
        if (content.skinId) {
            const { SkinSystem } = await import('./SkinSystem');
            const res = await SkinSystem.removeSkin(order.userId, content.skinId);
            if (!res.success) {
                console.warn(`[PaymentSystem] 回退皮肤失败 user=${order.userId} skin=${content.skinId}: ${res.error}`);
            }
        }

        // 回退 VIP 天数
        if (content.vipDays || content.vipDuration) {
            const days = content.vipDays || content.vipDuration || 0;
            const { VIPSystem } = await import('./VIPSystem');
            await VIPSystem.revokeVIP(order.userId, days);
        }

        // 回退赛季通行证及已领取奖励（仅金币/彩票可回退）
        if (content.seasonId) {
            const { SeasonSystem, BattlePassType } = await import('./SeasonSystem');
            SeasonSystem.revokePremiumPass(order.userId);
            // 撤销已领取的高级奖励
            const data = SeasonSystem.getClaimableRewards(order.userId); // reuse to get unlocked levels
            // 粗略回退：对已领取的 premium 奖励做撤销（金币/票）
            // 实际领取记录在 getUserSeasonData 的 claimedPremiumRewards
            const seasonData: any = (SeasonSystem as any).getUserSeasonData(order.userId);
            for (const lvl of seasonData.claimedPremiumRewards.slice()) {
                await SeasonSystem.revokeClaimedReward(order.userId, lvl, BattlePassType.Premium);
            }
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
     * 金额折算到基准货币
     */
    private static convertToBase(amount: number, currency: string, base: string): number {
        const cur = currency.toUpperCase();
        const b = base.toUpperCase();
        if (cur === b) return amount;
        const rateCur = this.fxRates[cur] ?? 1;
        const rateBase = this.fxRates[b] ?? 1;
        return amount * (rateCur / rateBase);
    }

    /**
     * 获取支付统计
     */
    static async getPaymentStats(userId?: string, base: string = this.fxBase): Promise<{
        totalOrders: number;
        totalRevenue: number;
        successRate: number;
        avgOrderValue: number;
    }> {
        const collection = MongoDBService.getCollection<PaymentOrder>('payment_orders');

        const query: any = userId ? { userId } : {};

        const orders = await collection.find(query).toArray();
        const paidOrders = orders.filter(o => [OrderStatus.Paid, OrderStatus.Delivered].includes(o.status));

        const totalOrders = orders.length;
        const successOrders = paidOrders.length;

        const totalRevenue = paidOrders.reduce((sum, o) => sum + this.convertToBase(o.amount, o.currency, base), 0);
        const avgOrderValue = paidOrders.length ? totalRevenue / paidOrders.length : 0;

        return {
            totalOrders,
            totalRevenue,
            successRate: totalOrders > 0 ? (successOrders / totalOrders) * 100 : 0,
            avgOrderValue
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
        byCurrency?: { currency: string; revenue: number; orders: number }[];
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

        const currencyPipeline = [
            { $match: match },
            {
                $group: {
                    _id: "$currency",
                    revenue: { $sum: "$amount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } as any }
        ];

        const [dailyResult, totalResult, topSpendersResult, currencyResult] = await Promise.all([
            collection.aggregate(dailyPipeline).toArray(),
            collection.aggregate(totalPipeline).toArray(),
            collection.aggregate(topSpendersPipeline).toArray(),
            collection.aggregate(currencyPipeline).toArray()
        ]);

        const totalStats = totalResult[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

        return {
            dailyRevenue: dailyResult.map(r => ({ date: r._id, revenue: r.revenue, orders: r.orders })),
            totalRevenue: totalStats.totalRevenue,
            totalOrders: totalStats.totalOrders,
            avgOrderValue: totalStats.avgOrderValue,
            topSpenders: topSpendersResult.map(r => ({ userId: r._id, total: r.total })),
            byCurrency: currencyResult.map(r => ({ currency: r._id, revenue: r.revenue, orders: r.orders }))
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

    /**
     * 记录 Stripe 事件（简易审计）
     */
    private static async logStripeEvent(eventType: string, payload: any) {
        try {
            const collection = MongoDBService.getCollection('payment_events');
        await collection.insertOne({
            eventId: payload?.eventId,
            eventType,
            payload,
            createdAt: Date.now()
        }, { bypassDocumentValidation: true });
        if (payload?.eventId) {
            await collection.createIndex({ eventId: 1 }, { unique: true });
        }
    } catch (err) {
        console.error('[PaymentSystem] 记录 Stripe 事件失败', err);
    }
}
}
