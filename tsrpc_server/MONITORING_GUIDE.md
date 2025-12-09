# 📊 性能监控指南

## 概述

本项目使用 Prometheus + Grafana + Alertmanager 构建完整的监控体系，提供实时性能监控、可视化仪表板和智能告警。

---

## 快速开始

### 1. 启动监控服务器

监控服务器会自动启动在端口 `9090`（可配置）：

```typescript
import { MetricsCollector } from './utils/MetricsCollector';
import { MonitoringServer } from './utils/MonitoringServer';

// 初始化 Metrics 收集器
MetricsCollector.init();

// 启动监控服务器
MonitoringServer.start(9090);
```

### 2. 访问监控端点

启动后，可以访问以下端点：

| 端点 | 说明 | 用途 |
|------|------|------|
| http://localhost:9090/ | 监控首页 | 查看所有可用端点 |
| http://localhost:9090/metrics | Prometheus metrics | 性能指标数据 |
| http://localhost:9090/health | 完整健康检查 | 所有依赖服务状态 |
| http://localhost:9090/live | 存活探针 | K8s liveness probe |
| http://localhost:9090/ready | 就绪探针 | K8s readiness probe |
| http://localhost:9090/info | 系统信息 | 运行时信息 |

### 3. 启动完整监控栈

使用 Docker Compose 一键启动 Prometheus + Grafana + Alertmanager：

```bash
cd monitoring
docker-compose up -d
```

启动后访问：
- **Grafana**: http://localhost:3001 (用户名: admin, 密码: admin123)
- **Prometheus**: http://localhost:9093
- **Alertmanager**: http://localhost:9094

### 4. 导入 Grafana 仪表盘

项目附带了 Gate/Match/Room API 的标准看板模板，路径：`prometheus/grafana-dashboard.json`。在 Grafana 中操作：
1. 点击左侧菜单 `Dashboards -> Import`
2. 选择上传 JSON 文件，指定 Prometheus 数据源
3. 命名并保存，即可看到延迟、QPS、错误率等指标（匹配/房间服务同步包含）。

---

## 监控指标

### API 性能指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `api_requests_total` | Counter | API 请求总数 |
| `api_response_time_seconds` | Histogram | API 响应时间分布 |
| `api_errors_total` | Counter | API 错误总数 |
| `api_concurrent_requests` | Gauge | 当前并发请求数 |

**标签**: `method`, `endpoint`, `status`, `error_type`

**示例查询**:
```promql
# API 请求速率
rate(api_requests_total[5m])

# P95 响应时间
histogram_quantile(0.95, rate(api_response_time_seconds_bucket[5m]))

# 错误率
rate(api_errors_total[5m]) / rate(api_requests_total[5m])
```

### 数据库性能指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `db_queries_total` | Counter | 数据库查询总数 |
| `db_query_duration_seconds` | Histogram | 查询时间分布 |
| `db_errors_total` | Counter | 数据库错误总数 |
| `db_connection_pool_size` | Gauge | 连接池大小 |

**标签**: `operation`, `collection`, `error_type`, `state`

**示例查询**:
```promql
# 数据库 QPS
rate(db_queries_total[5m])

# P95 查询时间
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))
```

### 缓存性能指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `cache_hits_total` | Counter | 缓存命中总数 |
| `cache_misses_total` | Counter | 缓存未命中总数 |
| `cache_sets_total` | Counter | 缓存写入总数 |
| `memory_cache_size` | Gauge | 内存缓存大小 |
| `cache_operation_duration_seconds` | Histogram | 缓存操作时间 |

**标签**: `cache_type`, `key_prefix`, `operation`

**示例查询**:
```promql
# 缓存命中率
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

### 业务指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `online_users` | Gauge | 在线用户数 |
| `active_rooms` | Gauge | 活跃游戏房间数 |
| `user_logins_total` | Counter | 用户登录总数 |
| `game_starts_total` | Counter | 游戏开始总数 |
| `transaction_amount_total` | Counter | 交易总金额 |

**标签**: `status`, `game_mode`, `currency_type`

### 系统资源指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `process_resident_memory_bytes` | Gauge | 进程内存使用 |
| `nodejs_heap_size_used_bytes` | Gauge | 堆内存使用 |
| `nodejs_eventloop_lag_seconds` | Gauge | 事件循环延迟 |
| `process_cpu_user_seconds_total` | Counter | CPU 用户态时间 |
| `nodejs_active_handles_total` | Gauge | 活跃句柄数 |

---

## 使用方法

### 在 API 中记录指标

```typescript
import { ApiTimer, recordApiError } from '../utils/MetricsCollector';
import { apiWrapper } from '../utils/ErrorHandler';
import { Logger } from '../utils/Logger';

export const ApiGetShopProducts = apiWrapper(async (call) => {
    // 启动计时器
    const timer = new ApiTimer('GET', '/gate/GetShopProducts');

    try {
        // 业务逻辑
        const products = await ShopSystem.getAvailableProducts(call.req.userId);

        // 记录成功
        timer.end('success');

        return { products };
    } catch (error) {
        // 记录错误
        timer.end('error');
        recordApiError('GET', '/gate/GetShopProducts', error.name);

        throw error;
    }
});
```

### 记录数据库查询

```typescript
import { DbTimer, recordDbError } from '../utils/MetricsCollector';

async function queryUsers(filter: any) {
    const timer = new DbTimer('find', 'users');

    try {
        const users = await usersCollection.find(filter).toArray();
        timer.end();
        return users;
    } catch (error) {
        timer.end();
        recordDbError('find', 'users', error.name);
        throw error;
    }
}
```

### 记录缓存指标

```typescript
import { recordCacheHit, recordCacheMiss, recordCacheSet } from '../utils/MetricsCollector';

async function getFromCache(key: string) {
    // 尝试从内存获取
    const memResult = memoryCache.get(key);
    if (memResult) {
        recordCacheHit('memory', 'api');
        return memResult;
    }
    recordCacheMiss('memory', 'api');

    // 尝试从 Redis 获取
    const redisResult = await redis.get(key);
    if (redisResult) {
        recordCacheHit('redis', 'api');
        return redisResult;
    }
    recordCacheMiss('redis', 'api');

    // 查询数据库
    const data = await fetchFromDatabase();

    // 写入缓存
    await redis.set(key, data);
    recordCacheSet('redis', 'api');

    return data;
}
```

### 更新业务指标

```typescript
import { updateOnlineUsers, updateActiveRooms, MetricsCollector } from '../utils/MetricsCollector';

// 定期更新业务指标
setInterval(() => {
    const onlineCount = getOnlineUserCount();
    updateOnlineUsers(onlineCount);

    const roomCount = getActiveRoomCount();
    updateActiveRooms(roomCount);
}, 10000); // 每10秒更新一次

// 记录用户登录
MetricsCollector.userLoginsTotal.inc({ status: 'success' });

// 记录游戏开始
MetricsCollector.gameStartsTotal.inc({ game_mode: 'normal' });

// 记录交易
MetricsCollector.transactionAmount.inc({ currency_type: 'gold' }, 100);
```

---

## Grafana 仪表板

### 导入仪表板

1. 登录 Grafana (http://localhost:3001)
2. 点击左侧菜单 "+" → "Import"
3. 上传 `monitoring/grafana-dashboard.json`
4. 选择 Prometheus 数据源

### 仪表板面板

仪表板包含以下关键面板：

#### 1. API 性能
- API 请求总数 (QPS)
- API 响应时间 (P50/P95/P99)
- API 错误率
- 并发请求数

#### 2. 数据库性能
- 数据库 QPS
- 查询时间分布
- 慢查询统计
- 连接池状态

#### 3. 缓存性能
- 缓存命中率（内存/Redis）
- 缓存大小
- 缓存操作延迟

#### 4. 系统资源
- CPU 使用率
- 内存使用
- 事件循环延迟
- GC 暂停时间

#### 5. 业务指标
- 在线用户数趋势
- 活跃房间数
- 游戏开始率
- 交易金额

---

## 告警规则

### 已配置的告警

**API 性能告警**:
- ❗ API 响应时间 > 1s (P95)
- 🚨 API 错误率 > 5%
- ⚠️ 并发请求 > 1000

**数据库告警**:
- ❗ 查询时间 > 0.5s (P95)
- 🚨 数据库错误频繁

**缓存告警**:
- ⚠️ 缓存命中率 < 60%
- ⚠️ 内存缓存项 > 5000

**系统资源告警**:
- 🚨 内存使用 > 2GB
- ⚠️ CPU 使用率 > 80%
- ⚠️ 事件循环延迟 > 100ms

**服务可用性告警**:
- 🚨 服务下线 > 1分钟
- 🚨 MongoDB 连接失败
- 🚨 Redis 连接失败

**业务指标告警**:
- ⚠️ 在线用户数下降 > 50%
- ⚠️ 活跃房间数 > 1000

### 告警级别

| 级别 | 标签 | 说明 |
|------|------|------|
| 🚨 Critical | `severity: critical` | 严重问题，需立即处理 |
| ⚠️ Warning | `severity: warning` | 警告，需要关注 |

### 告警通知

配置 Alertmanager 发送告警到：
- Slack (#alerts-critical, #alerts-warning)
- Email (ops-team@example.com)
- Webhook (自定义处理)

---

## Kubernetes 集成

### Health Check 配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: coin-pusher-gate
spec:
  containers:
  - name: gate-server
    image: coin-pusher-gate:latest
    ports:
    - containerPort: 3000  # 业务端口
    - containerPort: 9090  # 监控端口

    # 存活探针
    livenessProbe:
      httpGet:
        path: /live
        port: 9090
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3

    # 就绪探针
    readinessProbe:
      httpGet:
        path: /ready
        port: 9090
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
```

### Service Monitor 配置

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: coin-pusher-game
spec:
  selector:
    matchLabels:
      app: coin-pusher-game
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
```

---

## 性能优化建议

### 基于监控数据的优化

**1. API 响应时间过长**
- 检查 P95 响应时间面板
- 定位慢接口（> 100ms）
- 优化建议：
  - 添加缓存
  - 优化数据库查询
  - 使用批量操作

**2. 缓存命中率低**
- 检查缓存命中率面板（目标 > 80%）
- 原因分析：
  - TTL 设置过短
  - 缓存 key 设计不合理
  - 热点数据未缓存
- 优化建议：
  - 延长高频数据 TTL
  - 添加缓存预热
  - 优化缓存策略

**3. 数据库查询慢**
- 检查查询时间分布
- 定位慢查询（> 50ms）
- 优化建议：
  - 添加索引
  - 优化查询语句
  - 使用批量查询

**4. 内存泄漏**
- 监控内存使用趋势
- 如果持续增长且不回落，可能存在泄漏
- 排查方法：
  - 检查内存缓存大小
  - 检查连接池是否正确释放
  - 使用 Node.js Profiler 定位

**5. 事件循环阻塞**
- 监控事件循环延迟（目标 < 10ms）
- 延迟过高会导致所有请求变慢
- 优化建议：
  - 避免 CPU 密集计算
  - 使用 Worker Threads
  - 分批处理大量数据

---

## 故障排查

### 常见问题

**Q: metrics 端点返回 404**

A: 检查 MonitoringServer 是否已启动
```typescript
MonitoringServer.start(9090);
```

**Q: Grafana 无法连接 Prometheus**

A: 检查 Prometheus 是否正常运行，网络是否互通
```bash
curl http://localhost:9093/-/healthy
```

**Q: 告警规则不生效**

A: 检查 `alert_rules.yml` 语法，reload Prometheus 配置
```bash
curl -X POST http://localhost:9093/-/reload
```

**Q: 健康检查失败**

A: 检查依赖服务（MongoDB, Redis）是否正常
```bash
curl http://localhost:9090/health
```

---

## 最佳实践

### 1. Metrics 命名规范

遵循 Prometheus 命名约定：
- 使用小写字母和下划线
- 以单位作为后缀（`_seconds`, `_bytes`, `_total`）
- Counter 使用 `_total` 后缀
- 示例：`api_requests_total`, `db_query_duration_seconds`

### 2. 标签使用

- 使用有意义的标签（`endpoint`, `method`, `status`）
- 避免高基数标签（如 userId, orderId）
- 标签值数量应控制在合理范围

### 3. 采样频率

- Prometheus 抓取间隔：15s（默认）
- 高频指标更新：10s
- 业务指标更新：30s-60s

### 4. 数据保留

- Prometheus 默认保留 15 天
- 生产环境建议：30-90 天
- 长期存储：使用 Thanos 或 Cortex

### 5. 告警配置

- 设置合理的阈值（基于历史数据）
- 避免告警疲劳（group_interval, repeat_interval）
- 重要告警立即通知，一般告警批量通知

---

## 相关文档

- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 官方文档](https://grafana.com/docs/)
- [prom-client API](https://github.com/siimon/prom-client)
- [P3_OPTIMIZATIONS_COMPLETED.md](./P3_OPTIMIZATIONS_COMPLETED.md) - P3 优化报告

---

**最后更新**: 2025-12-08
**维护者**: DevOps Team
