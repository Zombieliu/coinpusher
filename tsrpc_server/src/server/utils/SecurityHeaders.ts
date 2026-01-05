/**
 * 🔒 Security Headers Middleware
 *
 * 实施OWASP推荐的HTTP安全响应头:
 * - Content-Security-Policy (CSP)
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - X-XSS-Protection
 * - Strict-Transport-Security (HSTS)
 * - Referrer-Policy
 * - Permissions-Policy
 *
 * 防护目标:
 * - XSS攻击
 * - 点击劫持 (Clickjacking)
 * - MIME类型嗅探
 * - 协议降级攻击
 */

export interface SecurityHeadersConfig {
    // Content Security Policy
    csp?: {
        enabled: boolean;
        directives?: {
            defaultSrc?: string[];
            scriptSrc?: string[];
            styleSrc?: string[];
            imgSrc?: string[];
            connectSrc?: string[];
            fontSrc?: string[];
            objectSrc?: string[];
            mediaSrc?: string[];
            frameSrc?: string[];
            workerSrc?: string[];
            upgradeInsecureRequests?: boolean;
            blockAllMixedContent?: boolean;
        };
        reportUri?: string;
        reportOnly?: boolean;  // 仅报告模式，不阻止
    };

    // HSTS (Strict-Transport-Security)
    hsts?: {
        enabled: boolean;
        maxAge?: number;           // 秒数，默认1年
        includeSubDomains?: boolean;
        preload?: boolean;
    };

    // 其他安全头
    noSniff?: boolean;             // X-Content-Type-Options: nosniff
    frameOptions?: 'DENY' | 'SAMEORIGIN' | string;  // X-Frame-Options
    xssProtection?: boolean;       // X-XSS-Protection: 1; mode=block
    referrerPolicy?: string;       // Referrer-Policy
    permissionsPolicy?: string;    // Permissions-Policy
}

export class SecurityHeaders {
    static enabled = process.env.SECURITY_HEADERS_ENABLED !== 'false';
    private static readonly DEFAULT_CONFIG: SecurityHeadersConfig = {
        csp: {
            enabled: true,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],  // WebSocket需要
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", 'wss:', 'ws:'],
                fontSrc: ["'self'", 'data:'],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                upgradeInsecureRequests: true,
                blockAllMixedContent: true
            },
            reportOnly: false
        },
        hsts: {
            enabled: true,
            maxAge: 31536000,  // 1年
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        frameOptions: 'DENY',
        xssProtection: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        permissionsPolicy: 'geolocation=(), microphone=(), camera=()'
    };

    private static config: SecurityHeadersConfig;

    /**
     * 🔒 初始化安全头配置
     */
    static initialize(customConfig?: Partial<SecurityHeadersConfig>): void {
        this.config = {
            ...this.DEFAULT_CONFIG,
            ...customConfig
        };

        // 生产环境强制启用
        if (process.env.NODE_ENV === 'production') {
            if (this.config.csp) this.config.csp.enabled = true;
            if (this.config.hsts) this.config.hsts.enabled = true;
        }

        console.log('🔒 [SecurityHeaders] Initialized');
    }

    /**
     * 🔒 生成安全响应头
     */
    static getHeaders(): Record<string, string> {
        if (!this.enabled) {
            return {};
        }
        if (!this.config) {
            this.initialize();
        }

        const headers: Record<string, string> = {};

        // Content-Security-Policy
        if (this.config.csp?.enabled) {
            const cspValue = this.buildCSP(this.config.csp);
            const headerName = this.config.csp.reportOnly
                ? 'Content-Security-Policy-Report-Only'
                : 'Content-Security-Policy';
            headers[headerName] = cspValue;
        }

        // Strict-Transport-Security (HSTS)
        if (this.config.hsts?.enabled) {
            let hstsValue = `max-age=${this.config.hsts.maxAge || 31536000}`;
            if (this.config.hsts.includeSubDomains) {
                hstsValue += '; includeSubDomains';
            }
            if (this.config.hsts.preload) {
                hstsValue += '; preload';
            }
            headers['Strict-Transport-Security'] = hstsValue;
        }

        // X-Content-Type-Options
        if (this.config.noSniff) {
            headers['X-Content-Type-Options'] = 'nosniff';
        }

        // X-Frame-Options
        if (this.config.frameOptions) {
            headers['X-Frame-Options'] = this.config.frameOptions;
        }

        // X-XSS-Protection
        if (this.config.xssProtection) {
            headers['X-XSS-Protection'] = '1; mode=block';
        }

        // Referrer-Policy
        if (this.config.referrerPolicy) {
            headers['Referrer-Policy'] = this.config.referrerPolicy;
        }

        // Permissions-Policy
        if (this.config.permissionsPolicy) {
            headers['Permissions-Policy'] = this.config.permissionsPolicy;
        }

        // 额外的安全头
        headers['X-Powered-By'] = 'Secure Server';  // 隐藏真实服务器信息
        headers['X-Download-Options'] = 'noopen';
        headers['X-Permitted-Cross-Domain-Policies'] = 'none';

        return headers;
    }

    /**
     * 🔒 构建CSP字符串
     */
    private static buildCSP(csp: NonNullable<SecurityHeadersConfig['csp']>): string {
        const directives: string[] = [];

        if (csp.directives) {
            const { directives: d } = csp;

            if (d.defaultSrc) {
                directives.push(`default-src ${d.defaultSrc.join(' ')}`);
            }
            if (d.scriptSrc) {
                directives.push(`script-src ${d.scriptSrc.join(' ')}`);
            }
            if (d.styleSrc) {
                directives.push(`style-src ${d.styleSrc.join(' ')}`);
            }
            if (d.imgSrc) {
                directives.push(`img-src ${d.imgSrc.join(' ')}`);
            }
            if (d.connectSrc) {
                directives.push(`connect-src ${d.connectSrc.join(' ')}`);
            }
            if (d.fontSrc) {
                directives.push(`font-src ${d.fontSrc.join(' ')}`);
            }
            if (d.objectSrc) {
                directives.push(`object-src ${d.objectSrc.join(' ')}`);
            }
            if (d.mediaSrc) {
                directives.push(`media-src ${d.mediaSrc.join(' ')}`);
            }
            if (d.frameSrc) {
                directives.push(`frame-src ${d.frameSrc.join(' ')}`);
            }
            if (d.workerSrc) {
                directives.push(`worker-src ${d.workerSrc.join(' ')}`);
            }
            if (d.upgradeInsecureRequests) {
                directives.push('upgrade-insecure-requests');
            }
            if (d.blockAllMixedContent) {
                directives.push('block-all-mixed-content');
            }
        }

        if (csp.reportUri) {
            directives.push(`report-uri ${csp.reportUri}`);
        }

        return directives.join('; ');
    }

    /**
     * 🔒 应用到HTTP响应
     */
    static applyToResponse(res: any): void {
        const headers = this.getHeaders();
        for (const [key, value] of Object.entries(headers)) {
            res.setHeader(key, value);
        }
    }

    /**
     * 🔒 Express/Koa中间件
     */
    static middleware() {
        const headers = this.getHeaders();

        return (req: any, res: any, next: any) => {
            // 应用所有安全头
            for (const [key, value] of Object.entries(headers)) {
                res.setHeader(key, value);
            }

            // 移除泄露服务器信息的头
            res.removeHeader('X-Powered-By');
            res.removeHeader('Server');

            next();
        };
    }

    /**
     * 🔒 为WebSocket连接设置安全选项
     */
    static getWebSocketOptions() {
        return {
            // 验证Origin
            verifyClient: (info: any, callback: any) => {
                const origin = info.origin || info.req.headers.origin;

                // 生产环境检查Origin白名单
                if (process.env.NODE_ENV === 'production') {
                    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

                    if (!origin || !allowedOrigins.includes(origin)) {
                        console.warn(`🔒 [SecurityHeaders] WebSocket rejected: invalid origin ${origin}`);
                        callback(false, 403, 'Origin not allowed');
                        return;
                    }
                }

                callback(true);
            },

            // 最大连接数
            maxPayload: 1024 * 1024,  // 1MB

            // 压缩
            perMessageDeflate: {
                zlibDeflateOptions: {
                    chunkSize: 1024,
                    memLevel: 7,
                    level: 3
                },
                clientNoContextTakeover: true,
                serverNoContextTakeover: true,
                serverMaxWindowBits: 10,
                concurrencyLimit: 10
            }
        };
    }

    /**
     * 🔒 CSP违规报告处理器
     */
    static handleCSPReport(report: any): void {
        console.warn('🔒 [SecurityHeaders] CSP Violation:', {
            documentUri: report['document-uri'],
            violatedDirective: report['violated-directive'],
            blockedUri: report['blocked-uri'],
            sourceFile: report['source-file'],
            lineNumber: report['line-number']
        });

        // TODO: 发送到监控系统 (Sentry, DataDog等)
    }

    /**
     * 🔒 获取配置信息
     */
    static getConfig(): SecurityHeadersConfig {
        return this.config || this.DEFAULT_CONFIG;
    }

    /**
     * 🔒 检查当前配置的安全等级
     */
    static getSecurityScore(): {
        score: number;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];
        let score = 100;

        const config = this.getConfig();

        // 检查CSP
        if (!config.csp?.enabled) {
            issues.push('CSP is disabled');
            score -= 20;
            recommendations.push('Enable Content-Security-Policy');
        } else if (config.csp.reportOnly) {
            issues.push('CSP is in report-only mode');
            score -= 5;
            recommendations.push('Switch CSP to enforcement mode');
        }

        // 检查HSTS
        if (!config.hsts?.enabled) {
            issues.push('HSTS is disabled');
            score -= 20;
            recommendations.push('Enable Strict-Transport-Security');
        } else if ((config.hsts.maxAge || 0) < 31536000) {
            issues.push('HSTS max-age is less than 1 year');
            score -= 5;
            recommendations.push('Set HSTS max-age to at least 1 year');
        }

        // 检查X-Frame-Options
        if (!config.frameOptions) {
            issues.push('X-Frame-Options not set');
            score -= 10;
            recommendations.push('Set X-Frame-Options to DENY or SAMEORIGIN');
        }

        // 检查其他头
        if (!config.noSniff) {
            issues.push('X-Content-Type-Options not set');
            score -= 5;
        }
        if (!config.xssProtection) {
            issues.push('X-XSS-Protection not set');
            score -= 5;
        }
        if (!config.referrerPolicy) {
            issues.push('Referrer-Policy not set');
            score -= 5;
        }

        return { score, issues, recommendations };
    }
}

// 默认初始化
SecurityHeaders.initialize();

/**
 * 🔒 使用示例
 *
 * ```typescript
 * // Express/Koa应用
 * app.use(SecurityHeaders.middleware());
 *
 * // WebSocket服务器
 * const wss = new WebSocket.Server({
 *   ...SecurityHeaders.getWebSocketOptions()
 * });
 *
 * // 自定义配置
 * SecurityHeaders.initialize({
 *   csp: {
 *     enabled: true,
 *     directives: {
 *       defaultSrc: ["'self'"],
 *       scriptSrc: ["'self'", 'https://cdn.example.com']
 *     }
 *   }
 * });
 *
 * // 获取安全评分
 * const { score, issues, recommendations } = SecurityHeaders.getSecurityScore();
 * console.log(`Security Score: ${score}/100`);
 * ```
 */
