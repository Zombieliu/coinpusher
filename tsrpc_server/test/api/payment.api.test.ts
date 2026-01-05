import { strict as assert } from 'assert';
import { ApiCreatePaymentOrder } from '../../src/server/gate/api/ApiCreatePaymentOrder';
import { ApiConfirmStripePayment } from '../../src/server/gate/api/ApiConfirmStripePayment';
import { PaymentSystem, PaymentChannel } from '../stubbed/PaymentSystemProxy';

function fakeCall<TReq, TRes>(req: TReq, ip = '127.0.0.1') {
    const call: any = {
        req,
        conn: { httpReq: { socket: { remoteAddress: ip } } },
        _succ: undefined as any,
        _err: undefined as any,
        succ(res: TRes) { this._succ = res; },
        error(msg: string) { this._err = msg; }
    };
    return call;
}

describe('Gate API (无网络调用)', () => {
    beforeEach(() => {
        // 重置 rateLimiter 计数
        ApiCreatePaymentOrder.rateLimiter = new (ApiCreatePaymentOrder.rateLimiter.constructor as any)();
    });

    it('CreatePaymentOrder 返回成功结果', async () => {
        (PaymentSystem as any).createOrder = async () => ({
            success: true,
            order: { orderId: 'order_api', channelOrderId: 'sess', paymentUrl: 'https://pay', status: 'pending' }
        });

        const call = fakeCall({ userId: 'u1', productId: 'p1', channel: PaymentChannel.Stripe });
        await ApiCreatePaymentOrder(call as any);

        assert.ok(call._succ);
        assert.strictEqual((call._succ as any).success, true);
        assert.strictEqual((call._succ as any).order.orderId, 'order_api');
    });

    it('CreatePaymentOrder 触发限流', async () => {
        (PaymentSystem as any).createOrder = async () => ({ success: true, order: { orderId: 'o', channelOrderId: 'c', paymentUrl: 'u' } });

        for (let i = 0; i < 10; i++) {
            const c = fakeCall({ userId: 'u', productId: 'p', channel: PaymentChannel.Stripe }, '1.1.1.1');
            await ApiCreatePaymentOrder(c as any);
            assert.ok(c._succ);
        }

        const blocked = fakeCall({ userId: 'u', productId: 'p', channel: PaymentChannel.Stripe }, '1.1.1.1');
        await ApiCreatePaymentOrder(blocked as any);
        assert.ok(blocked._err);
    });

    it('ConfirmStripePayment 返回 order', async () => {
        (PaymentSystem as any).confirmStripePayment = async () => ({
            success: true,
            order: { orderId: 'o2', status: 'paid' }
        });

        const call = fakeCall({ sessionId: 'cs_x' });
        await ApiConfirmStripePayment(call as any);

        assert.ok(call._succ);
        assert.strictEqual((call._succ as any).success, true);
        assert.strictEqual((call._succ as any).order.orderId, 'o2');
    });
});
