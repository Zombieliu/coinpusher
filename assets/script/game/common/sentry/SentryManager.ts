import { director, Director, sys } from "cc";
// import { CC_EDITOR } from "cc/env";

export class SentryManager {
    private static _instance: SentryManager;
    private _sentryInitialized: boolean = false;
    private _Sentry: any = null;

    static get instance(): SentryManager {
        if (!this._instance) {
            this._instance = new SentryManager();
        }
        return this._instance;
    }

    init() {
        if (this._sentryInitialized) return;

        if (sys.isBrowser && !CC_EDITOR) {
            console.log("[SentryManager] Initializing Sentry for Browser...");

            try {
                this._Sentry = require("@sentry/browser");

                this._Sentry.init({
                    dsn: "https://d0ee28b19d50e49de02479d63a016333@o4509310971609088.ingest.us.sentry.io/4510449348706304",
                    release: "numeron-coin-pusher@1.0.0",
                    environment: "production",
                    sendDefaultPii: true,
                    defaultIntegrations: false,
                    autoSessionTracking: true
                });

                console.log("[SentryManager] Sentry initialized successfully");
                this._sentryInitialized = true;
                this._setupGlobalHandlers();
            } catch (e) {
                console.error('[SentryManager] Failed to initialize Sentry:', e);
            }
        } else {
            console.warn('[SentryManager] Sentry skipped (not browser environment or in editor).');
        }
    }

    private _setupGlobalHandlers() {
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
            originalConsoleError.apply(console, args);
            
            const message = args.join(' ');
            if (message.includes('[Scene]') && this._sentryInitialized) {
                this.captureError(new Error(message), { tag: "console_error" });
            }
        };
    }

    captureError(error: any, context?: { tag?: string, extra?: any }) {
        if (!sys.isBrowser || !this._sentryInitialized) return;

        this._Sentry.withScope((scope: any) => {
            if (context?.tag) {
                scope.setTag("error_type", context.tag);
            }
            if (context?.extra) {
                scope.setExtra("context", context.extra);
            }
            this._Sentry.captureException(error);
        });
    }

    addBreadcrumb(category: string, message: string, level: any = "info") {
        if (!sys.isBrowser || !this._sentryInitialized) return;

        this._Sentry.addBreadcrumb({
            category: category,
            message: message,
            level: level,
            timestamp: Date.now() / 1000
        });
    }
}