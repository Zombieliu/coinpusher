import Stripe from 'stripe';
import { MongoClient } from 'mongodb';
import { MongoDBService } from '../src/server/gate/db/MongoDBService';
import { PaymentSystem } from '../src/server/gate/bll/PaymentSystem';

/**
 * 简易 Stripe 对账脚本
 * 作用：拉取近 N 天 PaymentIntent，与本地 payment_orders 按 channelOrderId 对比，输出缺失/状态不一致的订单。
 * 运行：
 *   STRIPE_SECRET_KEY=sk_test_xxx MONGO_URI=mongodb://localhost:27017 DB_NAME=coinpusher_game \\
 *   npx ts-node scripts/stripe-reconcile.ts --days 3 [--apply]
 */

const DAYS = parseInt(process.argv[process.argv.indexOf('--days') + 1] || '3', 10);
const APPLY = process.argv.includes('--apply');
const AUTO = process.argv.includes('--auto'); // 自动尝试补单（仅 status_mismatch 且本地有订单）
const stripeKey = process.env.STRIPE_SECRET_KEY;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'coinpusher_game';

if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY 未设置');
    process.exit(1);
}

async function main() {
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const since = Date.now() - DAYS * 24 * 60 * 60 * 1000;

    // 拉 Stripe intents
    const intents: any[] = [];
    for await (const pi of stripe.paymentIntents.list({
        limit: 100,
        created: { gte: Math.floor(since / 1000) }
    })) {
        intents.push(pi);
    }

    // Mongo
    const mongo = new MongoClient(mongoUri);
    await mongo.connect();
    const db = mongo.db(dbName);
    const orders = db.collection('payment_orders');
    const flags = db.collection('payment_reconcile_flags');

    // 初始化 PaymentSystem 依赖（用于 AUTO 补单）
    await MongoDBService.connect(mongoUri, dbName);

    const missingInDb: string[] = [];
    const statusMismatch: Array<{ intentId: string; stripeStatus: string; dbStatus: string; orderId: string }> = [];

    for (const pi of intents) {
        const order = await orders.findOne({ channelOrderId: pi.id });
        if (!order) {
            missingInDb.push(pi.id);
            continue;
        }
        const paid = pi.status === 'succeeded';
        const dbPaid = ['paid', 'delivered', 'refunded'].includes(order.status);
        if (paid !== dbPaid) {
            statusMismatch.push({ intentId: pi.id, stripeStatus: pi.status, dbStatus: order.status, orderId: order.orderId });
            if (AUTO) {
                const res = await PaymentSystem.confirmStripeIntent(pi.id);
                console.log(`[AUTO] intent=${pi.id} order=${order.orderId} => ${res.success ? 'OK' : res.error}`);
            }
        }
    }

    if (AUTO && missingInDb.length) {
        for (const pi of intents.filter(p => missingInDb.includes(p.id))) {
            const res = await PaymentSystem.recoverOrderFromStripeIntent(pi);
            console.log(`[AUTO-RECOVER] intent=${pi.id} => ${res.success ? 'OK' : res.error}`);
        }
    }

    console.log(`Stripe intents (last ${DAYS} days): ${intents.length}`);
    console.log(`缺少本地订单: ${missingInDb.length}`);
    if (missingInDb.length) console.log(missingInDb.join('\n'));
    console.log(`状态不一致: ${statusMismatch.length}`);
    if (statusMismatch.length) console.table(statusMismatch);

    if (APPLY) {
        const ops: any[] = [];
        for (const id of missingInDb) {
            ops.push({ updateOne: { filter: { intentId: id }, update: { $set: { intentId: id, type: 'missing_order', createdAt: Date.now() } }, upsert: true } });
        }
        for (const row of statusMismatch) {
            ops.push({ updateOne: { filter: { intentId: row.intentId }, update: { $set: { ...row, type: 'status_mismatch', createdAt: Date.now() } }, upsert: true } });
        }
        if (ops.length) {
            await flags.bulkWrite(ops, { ordered: false });
            console.log(`已写入 reconcile flags: ${ops.length}`);
        }
    }

    await mongo.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
