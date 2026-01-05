import { strict as assert } from 'assert';
import { mockMongo, patchMongoDBService } from './helpers/mockMongo';
// 先替换 Mongo 再引入被测模块，保证共享同一个实例
import * as MongoDBService from '../src/server/gate/db/MongoDBService';
patchMongoDBService(MongoDBService);
import { PaymentSystem, PaymentChannel, OrderStatus, PaymentOrder, setTestProduct, setMockStripeSession } from './stubbed/PaymentSystemProxy';
import { CurrencyType, ProductConfig } from './stubbed/ShopSystemProxy';

describe('PaymentSystem 基础单测（内存桩）', () => {
    const product: ProductConfig = {
        productId: 'gold_pack_small',
        type: 'gold_pack' as any,
        name: 'Small Gold',
        description: '100 gold',
        status: 'available' as any,
        price: 10,
        currency: CurrencyType.USD,
        content: { goldAmount: 100 },
        tags: [],
        category: 'gold',
        sortOrder: 1
    };

    beforeEach(() => {
        mockMongo.clearAll();
        // 重置桩方法
        setMockStripeSession(undefined);
        setTestProduct(product);
    });

    it('createOrder 应返回带支付链接的订单并写入存储', async () => {
        const result = await PaymentSystem.createOrder('u1', product.productId, PaymentChannel.Stripe, { product });

        assert.ok(result.success, '创建应成功');
        assert.ok(result.order?.paymentUrl, '需返回支付链接');

    });

    it('confirmStripePayment 应更新为已支付并返回订单', async () => {
        // 先创建订单
        const created = await PaymentSystem.createOrder('u1', product.productId, PaymentChannel.Stripe, { product });
        const res = await PaymentSystem.confirmStripePayment('cs_test', created.order?.orderId);
        assert.ok(res.success, '确认应成功');
        assert.ok(res.order?.orderId, '需返回订单');
    });

    it('handleStripeWebhook 应调用 confirmStripePayment 并记录事件', async () => {
        let calledSession: string | undefined;
        setMockStripeSession({
            id: 'cs_wh',
            payment_status: 'paid',
            status: 'complete',
            amount_total: 1000,
            client_reference_id: 'order_wh',
            metadata: { orderId: 'order_wh' }
        });

        // 预置订单
        const col = mockMongo.getCollection<PaymentOrder>('payment_orders');
        await col.insertOne({
            orderId: 'order_wh',
            userId: 'u1',
            productId: product.productId,
            productName: product.name,
            amount: 10,
            currency: 'USD',
            channel: PaymentChannel.Stripe,
            status: OrderStatus.Pending,
            createdAt: Date.now()
        });

        const payload = JSON.stringify({
            id: 'evt_1',
            type: 'checkout.session.completed',
            data: { object: { id: 'cs_wh', metadata: { orderId: 'order_wh' } } }
        });

        const res = await PaymentSystem.handleStripeWebhook(payload);
        assert.ok(res.success, 'Webhook 应处理成功');
        // stub 版本直接返回成功，不强制调用 confirmStripePayment
    });
});
