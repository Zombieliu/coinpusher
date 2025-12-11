import { MongoDBService } from "../gate/db/MongoDBService";
import { NotificationSystem } from "../gate/bll/NotificationSystem";
import { OrderStatus, PaymentOrder } from "../gate/bll/PaymentSystem";
import nodemailer, { Transporter } from "nodemailer";

export class FinanceHealthMonitor {
    private static initialized = false;
    private static lastAlerts: Map<string, number> = new Map();
    private static interval: NodeJS.Timeout | null = null;
    private static transporter: Transporter | null = null;

    static start(intervalMs: number = Number(process.env.FINANCE_HEALTH_INTERVAL || 5 * 60 * 1000)) {
        if (this.initialized) return;
        this.initialized = true;
        this.runChecks().catch(err => console.error('[FinanceHealthMonitor] initial check failed:', err));
        this.interval = setInterval(() => {
            this.runChecks().catch(err => console.error('[FinanceHealthMonitor] check failed:', err));
        }, Math.max(intervalMs, 60_000));
        console.log('[FinanceHealthMonitor] started, interval:', intervalMs);
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.initialized = false;
    }

    private static async runChecks() {
        try {
            const now = Date.now();
            const orders = MongoDBService.getCollection<PaymentOrder>('payment_orders');
            const refunds = MongoDBService.getCollection<any>('refund_requests');

            const pendingRefunds = await refunds.countDocuments({ status: 'pending' });
            if (pendingRefunds >= Number(process.env.FINANCE_ALERT_PENDING_REFUNDS || 10)) {
                this.pushAlert('pending_refunds', `当前有 ${pendingRefunds} 条退款申请等待处理`, { pendingRefunds });
            }

            const stuckPaid = await orders.countDocuments({
                status: OrderStatus.Paid,
                createdAt: { $lt: now - (Number(process.env.FINANCE_STUCK_ORDER_MS) || 2 * 60 * 60 * 1000) }
            });
            if (stuckPaid > 0) {
                this.pushAlert('stuck_paid_orders', `${stuckPaid} 个已支付订单超过 2 小时未发货`, { stuckPaid });
            }

            const failedRecent = await orders.countDocuments({
                status: OrderStatus.Failed,
                updatedAt: { $gte: now - (60 * 60 * 1000) }
            });
            if (failedRecent >= Number(process.env.FINANCE_ALERT_FAILED_ORDERS || 5)) {
                this.pushAlert('failed_orders', `近 1 小时有 ${failedRecent} 个订单失败`, { failedRecent });
            }
        } catch (error) {
            console.error('[FinanceHealthMonitor] runChecks error:', error);
        }
    }

    private static async pushAlert(key: string, message: string, data?: any) {
        const cooldown = Number(process.env.FINANCE_ALERT_COOLDOWN_MS || 30 * 60 * 1000);
        const last = this.lastAlerts.get(key) || 0;
        if (Date.now() - last < cooldown) {
            return;
        }
        this.lastAlerts.set(key, Date.now());
        NotificationSystem.sendSystemAlert(message, { ...data, alertKey: key });
        await this.sendEmailAlert(key, message, data);
    }

    private static getMailer(): Transporter | null {
        if (this.transporter) return this.transporter;
        const host = process.env.FINANCE_EMAIL_SMTP_HOST;
        const port = Number(process.env.FINANCE_EMAIL_SMTP_PORT || 465);
        if (!host) return null;
        const secure = (process.env.FINANCE_EMAIL_SMTP_SECURE || 'true').toLowerCase() !== 'false';
        const user = process.env.FINANCE_EMAIL_SMTP_USER;
        const pass = process.env.FINANCE_EMAIL_SMTP_PASS;
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: user ? { user, pass } : undefined,
        });
        return this.transporter;
    }

    private static async sendEmailAlert(key: string, message: string, data?: any) {
        const to = process.env.FINANCE_EMAIL_TO;
        const from = process.env.FINANCE_EMAIL_FROM;
        if (!to || !from) return;
        const mailer = this.getMailer();
        if (!mailer) return;

        try {
            const text = `财务健康告警 (${key})\n${message}\n${JSON.stringify(data || {}, null, 2)}`;
            await mailer.sendMail({
                from,
                to,
                subject: `[Oops Finance Alert] ${key}`,
                text,
                html: `<h3>财务健康告警 (${key})</h3><p>${message}</p><pre>${JSON.stringify(data || {}, null, 2)}</pre>`
            });
        } catch (error) {
            console.error('[FinanceHealthMonitor] sendEmailAlert failed:', error);
        }
    }
}
