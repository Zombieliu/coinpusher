import { MongoDBService } from "../gate/db/MongoDBService";
import { NotificationSystem } from "../gate/bll/NotificationSystem";
import { OrderStatus, PaymentOrder } from "../gate/bll/PaymentSystem";
import tls from "tls";
import net from "net";
import { Buffer } from "buffer";

type SmtpSocket = tls.TLSSocket | net.Socket;

export class FinanceHealthMonitor {
    private static initialized = false;
    private static lastAlerts: Map<string, number> = new Map();
    private static interval: NodeJS.Timeout | null = null;

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

    private static async sendEmailAlert(key: string, message: string, data?: any) {
        const to = process.env.FINANCE_EMAIL_TO;
        const from = process.env.FINANCE_EMAIL_FROM;
        const host = process.env.FINANCE_EMAIL_SMTP_HOST;
        if (!to || !from || !host) return;

        const port = Number(process.env.FINANCE_EMAIL_SMTP_PORT || 465);
        const secure = (process.env.FINANCE_EMAIL_SMTP_SECURE || 'true').toLowerCase() !== 'false';
        const user = process.env.FINANCE_EMAIL_SMTP_USER;
        const pass = process.env.FINANCE_EMAIL_SMTP_PASS;
        const recipients = to.split(/[,;]+/).map(addr => addr.trim()).filter(Boolean);
        if (!recipients.length) return;

        try {
            const socket = await this.createSmtpSocket({ host, port, secure });
            try {
                await this.expectResponse(socket, 220);
                await this.sendCommand(socket, `EHLO finance-monitor\r\n`, 250);

                if (user && pass) {
                    await this.sendCommand(socket, `AUTH LOGIN\r\n`, 334);
                    await this.sendCommand(socket, `${Buffer.from(user).toString('base64')}\r\n`, 334);
                    await this.sendCommand(socket, `${Buffer.from(pass).toString('base64')}\r\n`, 235);
                }

                await this.sendCommand(socket, `MAIL FROM:<${from}>\r\n`, 250);
                for (const recipient of recipients) {
                    await this.sendCommand(socket, `RCPT TO:<${recipient}>\r\n`, 250);
                }

                await this.sendCommand(socket, `DATA\r\n`, 354);
                const subject = `[Oops Finance Alert] ${key}`;
                const payload = this.composeEmail({ from, to: recipients.join(', '), subject, key, message, data });
                await this.sendCommand(socket, `${payload}\r\n.\r\n`, 250);
                await this.sendCommand(socket, `QUIT\r\n`, 221);
            } finally {
                socket.end();
            }
        } catch (error) {
            console.error('[FinanceHealthMonitor] sendEmailAlert failed:', error);
        }
    }

    private static composeEmail(params: { from: string; to: string; subject: string; key: string; message: string; data?: any }) {
        const lines = [
            `From: ${params.from}`,
            `To: ${params.to}`,
            `Subject: ${params.subject}`,
            `Date: ${new Date().toUTCString()}`,
            '',
            `类型: ${params.key}`,
            params.message,
            '',
            JSON.stringify(params.data || {}, null, 2),
            ''
        ];
        const body = lines.join('\r\n').replace(/\r?\n/g, '\r\n');
        return body.replace(/\r\n\./g, '\r\n..');
    }

    private static createSmtpSocket(opts: { host: string; port: number; secure: boolean }): Promise<SmtpSocket> {
        return new Promise((resolve, reject) => {
            const socket = opts.secure
                ? tls.connect({ host: opts.host, port: opts.port, servername: opts.host })
                : net.connect({ host: opts.host, port: opts.port });

            const onError = (err: Error) => {
                socket.removeListener('timeout', onTimeout);
                reject(err);
            };
            const onTimeout = () => {
                socket.destroy(new Error('SMTP connection timeout'));
                reject(new Error('SMTP connection timeout'));
            };
            const onConnect = () => {
                socket.removeListener('error', onError);
                socket.removeListener('connect', onConnect);
                socket.removeListener('secureConnect', onConnect);
                socket.setTimeout(15000, onTimeout);
                socket.on('timeout', onTimeout);
                resolve(socket);
            };

            socket.once('error', onError);
            if (opts.secure) {
                (socket as tls.TLSSocket).once('secureConnect', onConnect);
            } else {
                socket.once('connect', onConnect);
            }
        });
    }

    private static async sendCommand(socket: SmtpSocket, command: string, expectedCode: number) {
        socket.write(command, 'utf8');
        const response = await this.readResponse(socket);
        if (response.code !== expectedCode) {
            throw new Error(`SMTP command failed (${command.trim()}): ${response.text.trim()}`);
        }
    }

    private static async expectResponse(socket: SmtpSocket, expectedCode: number) {
        const response = await this.readResponse(socket);
        if (response.code !== expectedCode) {
            throw new Error(`Unexpected SMTP response: ${response.text.trim()}`);
        }
    }

    private static readResponse(socket: SmtpSocket): Promise<{ code: number; text: string }> {
        return new Promise((resolve, reject) => {
            let buffer = '';
            const onData = (chunk: Buffer) => {
                buffer += chunk.toString('utf8');
                const lines = buffer.split(/\r?\n/).filter(Boolean);
                if (!lines.length) {
                    return;
                }

                const lastLine = lines[lines.length - 1];
                if (lastLine.length >= 4 && /^\d{3}/.test(lastLine.slice(0, 3)) && lastLine[3] === ' ') {
                    cleanup();
                    resolve({ code: parseInt(lastLine.slice(0, 3), 10), text: buffer });
                }
            };
            const onError = (err: Error) => {
                cleanup();
                reject(err);
            };
            const onClose = () => {
                cleanup();
                reject(new Error('SMTP connection closed'));
            };
            const cleanup = () => {
                socket.off('data', onData);
                socket.off('error', onError);
                socket.off('close', onClose);
            };

            socket.on('data', onData);
            socket.once('error', onError);
            socket.once('close', onClose);
        });
    }
}
