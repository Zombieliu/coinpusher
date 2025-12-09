/**
 * 🔍 监控服务器
 *
 * 提供 HTTP 端点用于：
 * 1. Prometheus metrics - /metrics
 * 2. 健康检查 - /health, /ready, /live
 * 3. 系统信息 - /info
 */

import * as http from 'http';
import { MetricsCollector } from './MetricsCollector';
import { HealthCheck } from './HealthCheck';
import { Logger } from './Logger';

export class MonitoringServer {
    private static server: http.Server | null = null;
    private static port: number = 9090;

    /**
     * 启动监控服务器
     */
    static start(port: number = 9090): void {
        if (this.server) {
            Logger.warn('Monitoring server already running');
            return;
        }

        this.port = port;

        this.server = http.createServer(async (req, res) => {
            try {
                await this.handleRequest(req, res);
            } catch (error) {
                Logger.error('Monitoring server error', { url: req.url }, error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });

        this.server.listen(port, () => {
            Logger.info('Monitoring server started', { port });
        });

        this.server.on('error', error => {
            Logger.error('Monitoring server error', { port }, error);
        });
    }

    /**
     * 停止监控服务器
     */
    static stop(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
            Logger.info('Monitoring server stopped');
        }
    }

    /**
     * 处理 HTTP 请求
     */
    private static async handleRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const url = req.url || '/';

        // 路由处理
        switch (url) {
            case '/metrics':
                await this.handleMetrics(req, res);
                break;

            case '/health':
                await this.handleFullHealth(req, res);
                break;

            case '/live':
            case '/liveness':
                await this.handleLiveness(req, res);
                break;

            case '/ready':
            case '/readiness':
                await this.handleReadiness(req, res);
                break;

            case '/info':
                await this.handleInfo(req, res);
                break;

            case '/':
                await this.handleRoot(req, res);
                break;

            default:
                this.handle404(req, res);
                break;
        }
    }

    /**
     * 处理 /metrics 请求
     */
    private static async handleMetrics(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        try {
            const metrics = await MetricsCollector.getMetrics();
            res.writeHead(200, { 'Content-Type': MetricsCollector.getContentType() });
            res.end(metrics);
        } catch (error) {
            Logger.error('Failed to get metrics', {}, error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Failed to get metrics');
        }
    }

    /**
     * 处理 /health 请求（完整健康检查）
     */
    private static async handleFullHealth(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const health = await HealthCheck.fullHealth();
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
    }

    /**
     * 处理 /live 请求（存活探针）
     */
    private static async handleLiveness(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const liveness = await HealthCheck.liveness();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(liveness, null, 2));
    }

    /**
     * 处理 /ready 请求（就绪探针）
     */
    private static async handleReadiness(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const readiness = await HealthCheck.readiness();
        const statusCode = readiness.ready ? 200 : 503;

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(readiness, null, 2));
    }

    /**
     * 处理 /info 请求（系统信息）
     */
    private static async handleInfo(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const info = HealthCheck.getSystemInfo();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(info, null, 2));
    }

    /**
     * 处理根路径请求
     */
    private static async handleRoot(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Coin Pusher Game - Monitoring</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #333; }
        .endpoint {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .endpoint h3 { margin: 0 0 10px 0; color: #2196F3; }
        .endpoint p { margin: 5px 0; color: #666; }
        a { color: #2196F3; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .status { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
        .status.healthy { background: #4CAF50; color: white; }
        .status.info { background: #2196F3; color: white; }
    </style>
</head>
<body>
    <h1>🎮 Coin Pusher Game - Monitoring</h1>
    <p>监控服务运行在端口 ${this.port}</p>

    <div class="endpoint">
        <h3>📊 <a href="/metrics">/metrics</a> <span class="status info">Prometheus</span></h3>
        <p>Prometheus metrics 端点，用于性能监控和告警</p>
        <p><strong>用途</strong>: Prometheus 抓取、Grafana 可视化</p>
    </div>

    <div class="endpoint">
        <h3>🏥 <a href="/health">/health</a> <span class="status healthy">健康检查</span></h3>
        <p>完整健康检查，包含所有依赖服务的状态</p>
        <p><strong>检查项</strong>: MongoDB, Redis, 内存, 进程</p>
    </div>

    <div class="endpoint">
        <h3>💚 <a href="/live">/live</a> <span class="status healthy">存活探针</span></h3>
        <p>Kubernetes liveness probe，检查进程是否存活</p>
        <p><strong>用途</strong>: K8s 自动重启失败的 Pod</p>
    </div>

    <div class="endpoint">
        <h3>✅ <a href="/ready">/ready</a> <span class="status healthy">就绪探针</span></h3>
        <p>Kubernetes readiness probe，检查服务是否就绪</p>
        <p><strong>用途</strong>: K8s 负载均衡和流量路由</p>
    </div>

    <div class="endpoint">
        <h3>ℹ️ <a href="/info">/info</a> <span class="status info">系统信息</span></h3>
        <p>系统运行时信息：版本、内存、运行时间等</p>
    </div>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <h2>📖 使用指南</h2>

    <h3>Prometheus 配置</h3>
    <pre style="background: white; padding: 15px; border-radius: 5px; overflow-x: auto;">
scrape_configs:
  - job_name: 'coin-pusher-game'
    static_configs:
      - targets: ['localhost:${this.port}']
    scrape_interval: 15s
    </pre>

    <h3>Kubernetes 健康检查配置</h3>
    <pre style="background: white; padding: 15px; border-radius: 5px; overflow-x: auto;">
livenessProbe:
  httpGet:
    path: /live
    port: ${this.port}
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: ${this.port}
  initialDelaySeconds: 10
  periodSeconds: 5
    </pre>
</body>
</html>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    /**
     * 处理 404
     */
    private static handle404(req: http.IncomingMessage, res: http.ServerResponse): void {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
            JSON.stringify({
                error: 'Not found',
                message: `Path ${req.url} not found`,
                availableEndpoints: ['/metrics', '/health', '/live', '/ready', '/info', '/'],
            })
        );
    }
}
