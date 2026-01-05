import { PaymentSystem as RealPaymentSystem, PaymentChannel, OrderStatus, PaymentOrder } from '../../src/server/gate/bll/PaymentSystem';
import { ShopSystem } from '../../src/server/gate/bll/ShopSystem';
import { MongoDBService } from '../../src/server/gate/db/MongoDBService';
import { mockMongo } from '../helpers/mockMongo';

type StripeSessionStub = any;

// 允许测试注入商品
let testProduct: any;
export function setTestProduct(p: any) {
    testProduct = p;
}

// 覆盖 ShopSystem.getProduct，优先返回测试商品
(ShopSystem as any).getProduct = (productId: string) => {
    if (testProduct && testProduct.productId === productId) return testProduct;
    return {
        productId,
        name: productId,
        price: 10,
        currency: 'USD',
        content: {}
    };
};

// 覆盖支付渠道发起逻辑，避免真实外部调用
(RealPaymentSystem as any).initiatePayment = async (_order: PaymentOrder) => {
    return { success: true, channelOrderId: 'sess_mock', paymentUrl: 'https://mock.pay' };
};

// 精简发货：仅更新状态
(RealPaymentSystem as any).deliverOrder = async (order: PaymentOrder) => {
    const col = MongoDBService.getCollection<PaymentOrder>('payment_orders');
    await col.updateOne(
        { orderId: order.orderId },
        { $set: { status: OrderStatus.Delivered, deliveredAt: Date.now() } }
    );
};

// 用内存集合替换 createOrder / confirmStripePayment / handleStripeWebhook，避免真实数据库依赖
(RealPaymentSystem as any).createOrder = async (
    userId: string,
    productId: string,
    channel: PaymentChannel,
    options?: { product?: any }
) => {
    const product = options?.product || (ShopSystem as any).getProduct(productId);
    if (!product) return { success: false, error: '商品不存在' };
    const orderId = `order_${Date.now()}`;
    const order: PaymentOrder = {
        orderId,
        userId,
        productId,
        productName: product.name,
        amount: product.price,
        currency: 'USD',
        channel,
        status: OrderStatus.Pending,
        createdAt: Date.now(),
        channelOrderId: 'sess_mock',
        paymentUrl: 'https://mock.pay'
    };
    const col = mockMongo.getCollection<PaymentOrder>('payment_orders');
    await col.insertOne(order);
    return {
        success: true,
        order: {
            ...order,
            channelOrderId: 'sess_mock',
            paymentUrl: 'https://mock.pay'
        }
    };
};

(RealPaymentSystem as any).confirmStripePayment = async (sessionId: string, orderId?: string) => {
    const col = mockMongo.getCollection<PaymentOrder>('payment_orders');
    const stored = await col.findOne(orderId ? { orderId } : {});
    if (!stored) return { success: false, error: '订单不存在' };
    const updated = { ...stored, status: OrderStatus.Delivered, paidAt: Date.now(), channelOrderId: sessionId };
    await col.updateOne({ orderId: stored.orderId }, { $set: updated });
    return { success: true, order: updated };
};

(RealPaymentSystem as any).handleStripeWebhook = async (_raw: string) => {
    return { success: true };
};

export let mockStripeRetrieveSession: StripeSessionStub | undefined;
export function setMockStripeSession(session: StripeSessionStub | undefined) {
    mockStripeRetrieveSession = session;
}

// 覆盖 Stripe 客户端
(RealPaymentSystem as any).getStripeClient = () => {
    return {
        checkout: {
            sessions: {
                create: async () => ({ id: 'cs_mock', url: 'https://mock.checkout' }),
                retrieve: async (_sid: string) => mockStripeRetrieveSession || {
                    id: _sid,
                    payment_status: 'paid',
                    status: 'complete',
                    amount_total: 1000,
                    metadata: { orderId: 'order_mock' }
                }
            }
        },
        paymentIntents: {
            retrieve: async (id: string) => ({
                id,
                amount_received: 1000,
                metadata: { orderId: 'order_mock' }
            })
        },
        webhooks: {
            constructEvent: (raw: string) => JSON.parse(raw)
        }
    };
};

// 公开同名导出供测试使用
export const PaymentSystem = RealPaymentSystem;
export { PaymentChannel, OrderStatus, PaymentOrder };
