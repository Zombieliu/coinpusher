import { oops } from "../../../../extensions/oops-plugin-framework/assets/core/Oops";
import { PaymentChannel, PaymentOrder } from "../../tsrpc/types/payment";
import { CurrencyType, ProductConfig } from "../../tsrpc/types/shop";
import { NetworkManager } from "./NetworkManager";
import { SecurityUtil } from "../security/SecurityUtil";

interface PendingStripe {
    orderId?: string;
    sessionId?: string;
}

class PaymentService {
    private readonly pendingKey = "pendingStripe";

    private async getClient() {
        const gate = NetworkManager.instance.gate;
        if (!gate.client) {
            // GateService.initClient 是私有方法，这里用 any 兜底调用
            await (gate as any).initClient?.();
        }
        if (!gate.client) {
            throw new Error("Payment client is not ready. Please try again shortly.");
        }
        return gate.client;
    }

    private getUserId(userId?: string) {
        const stored =
            userId ||
            oops.storage.get("USER_ID") ||
            (typeof localStorage !== "undefined" ? localStorage.getItem("USER_ID") : null) ||
            (typeof localStorage !== "undefined" ? localStorage.getItem("persist_userId") : null);

        if (!stored) {
            throw new Error("Please log in before making a purchase.");
        }
        return stored.toString();
    }

    private savePending(pending: PendingStripe) {
        if (typeof window === "undefined") return;
        sessionStorage.setItem(this.pendingKey, JSON.stringify(pending));
    }

    private loadPending(): PendingStripe | null {
        if (typeof window === "undefined") return null;
        const raw = sessionStorage.getItem(this.pendingKey);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    private clearPending() {
        if (typeof window === "undefined") return;
        sessionStorage.removeItem(this.pendingKey);
    }

    private async pickProduct(userId: string, productId?: string): Promise<ProductConfig> {
        if (productId) {
            return { productId } as ProductConfig;
        }

        const client = await this.getClient();
        const res = await client.callApi("GetShopProducts", { userId });
        if (!res.isSucc) {
            throw new Error(res.err?.message || "Failed to fetch products");
        }

        // 选择首个可购买的商品（金币计价也允许，会按 GOLD_PER_USD 折算）
        const candidates = res.res.products ?? [];
        if (!candidates.length) {
            throw new Error("No purchasable products are available");
        }
        return candidates[0];
    }

    async startStripe(options: { userId?: string; productId?: string } = {}): Promise<PaymentOrder> {
        const userId = this.getUserId(options.userId);
        const client = await this.getClient();

        const product = await this.pickProduct(userId, options.productId);
        const [fingerprintId, nonce, timestamp] = await Promise.all([
            SecurityUtil.getFingerprintId(),
            Promise.resolve(SecurityUtil.generateNonce()),
            Promise.resolve(SecurityUtil.now())
        ]);

        const res = await client.callApi("CreatePaymentOrder", {
            userId,
            productId: product.productId,
            channel: PaymentChannel.Stripe,
            fingerprintId,
            nonce,
            timestamp
        });

        if (!res.isSucc || !res.res.success || !res.res.order || !res.res.order.paymentUrl) {
            throw new Error(res.err?.message || res.res.error || "Failed to create order");
        }

        const order = res.res.order;
        this.savePending({ orderId: order.orderId, sessionId: order.channelOrderId });

        // 跳转至 Stripe Checkout
        if (typeof window !== "undefined") {
            window.location.href = order.paymentUrl;
        }

        return order;
    }

    async confirmStripe(sessionId: string, orderId?: string): Promise<PaymentOrder> {
        const client = await this.getClient();
        const [fingerprintId, nonce, timestamp] = await Promise.all([
            SecurityUtil.getFingerprintId(),
            Promise.resolve(SecurityUtil.generateNonce()),
            Promise.resolve(SecurityUtil.now())
        ]);

        const res = await client.callApi("ConfirmStripePayment", { sessionId, orderId, fingerprintId, nonce, timestamp });

        if (!res.isSucc || !res.res.success || !res.res.order) {
            throw new Error(res.err?.message || res.res.error || "Failed to confirm payment");
        }

        this.clearPending();
        return res.res.order;
    }

    async handleReturnFromUrl() {
        if (typeof window === "undefined") return;

        const { sessionId, orderId, userId, path, isCancel } = this.parseUrlParams();

        try {
            // 只要带有 sessionId，无论路径如何都尝试确认
            if (sessionId) {
                // 优先持久化 userId，方便后续接口
                if (userId && typeof localStorage !== "undefined") {
                    localStorage.setItem("USER_ID", userId);
                    localStorage.setItem("persist_userId", userId);
                }
                await this.confirmStripe(sessionId, orderId || this.loadPending()?.orderId);
                oops.gui.toast("Payment succeeded. Refreshing data…");
                return;
            }

            if (isCancel) {
                this.clearPending();
                oops.gui.toast("Payment was cancelled");
                return;
            }

            // 如果留存了 pending，但没有路由参数，尝试自动确认
            const pending = this.loadPending();
            if (pending?.sessionId) {
                await this.confirmStripe(pending.sessionId, pending.orderId);
                oops.gui.toast("Payment restored and confirmed");
            }
        } catch (error: any) {
            console.error("[PaymentService] handleReturnFromUrl failed:", error);
            oops.gui.toast(error?.message || "Payment processing failed");
        }
    }

    private parseUrlParams(): { sessionId?: string; orderId?: string; userId?: string; path: string; isCancel: boolean } {
        const url = new URL(window.location.href);
        // search params
        let sessionId = url.searchParams.get("sessionId") || url.searchParams.get("session_id") || undefined;
        let orderId = url.searchParams.get("orderId") || url.searchParams.get("order_id") || undefined;
        let userId = url.searchParams.get("userId") || url.searchParams.get("user_id") || undefined;
        let isCancel = url.searchParams.get("stripe-cancel") === "1";
        let path = url.pathname.toLowerCase();

        // hash params: support #/stripe-success?sessionId=...
        const hash = window.location.hash || "";
        if (hash) {
            const hashPath = hash.replace(/^#/, "");
            const [hp, hq] = hashPath.split("?");
            if (hp) path = hp.toLowerCase();
            if (hq) {
                const hParams = new URLSearchParams(hq);
                sessionId = sessionId || hParams.get("sessionId") || hParams.get("session_id") || undefined;
                orderId = orderId || hParams.get("orderId") || hParams.get("order_id") || undefined;
                userId = userId || hParams.get("userId") || hParams.get("user_id") || undefined;
                isCancel = isCancel || hParams.get("stripe-cancel") === "1";
            }
        }

        // 兼容旧路径检测
        if (path.includes("stripe-cancel")) {
            isCancel = true;
        }

        return { sessionId, orderId, userId, path, isCancel };
    }
}

export const paymentService = new PaymentService();
