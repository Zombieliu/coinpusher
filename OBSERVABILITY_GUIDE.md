# 监控与可观测性部署指南

本指南说明如何在 Railway 中接入 Grafana Stack（Grafana + Prometheus + Loki + Tempo），并把 Gate / Match / Room 服务暴露的指标数据接入到 Grafana 看板。

---

## 1. 前提条件

1. Gate/Match/Room 服务已在 Railway 运行，并通过环境变量暴露监控端口：
   - `MONITORING_PORT=9090`（Gate）
   - `MONITORING_PORT=9091`（Match）
   - `MONITORING_PORT=9092`（Room）
2. TSRPC 服务均使用 `tsrpc_server/Dockerfile` 构建，默认已经启动 `MonitoringServer` 并在 `/metrics` 提供 Prometheus 指标。
3. Railway 项目已启用自托管数据库（MongoDB、Dragonfly 等）并与上述服务互通。

---

## 2. Railway 侧新增 Grafana Stack

1. 打开 Railway 控制台 → 目标项目 → “Add New Service”。
2. 选择 **Deploy Template**，搜索 “Grafana Stack” 或直接使用 `MykalMachon/railway-grafana-stack` 模板。
3. Railway 会同时创建四个服务：
   - `grafana`（Web 可视化，默认端口 3000）
   - `prometheus`（指标采集）
   - `loki`（日志聚合，暂可保留默认配置）
   - `tempo`（链路追踪，暂可保留默认配置）
4. 在模板弹窗中填写必需变量 `GF_SECURITY_ADMIN_USER`（Grafana admin 用户名），建议同时手动添加 `GF_SECURITY_ADMIN_PASSWORD` 以替换默认密码。
5. 完成后点击 “Deploy Template”，等待四个服务构建完成。

---

## 3. Prometheus 指标采集配置

模板自带的 `prometheus` 服务配置位于其仓库中，可通过 Railway 的 “Variables” 或 “Files” 覆盖。我们只需要向 Prometheus 添加新的 scrape job，使其抓取 Gate/Match/Room 暴露的 `/metrics`。

1. 在 `prometheus` 服务的 “Variables” 中添加或编辑 `PROMETHEUS_CONFIG`（若模板已经注入，可复制出来在本地编辑）。
2. 在 `scrape_configs` 增加以下内容（示例）：

```yaml
scrape_configs:
  - job_name: 'tsrpc_gate'
    metrics_path: /metrics
    static_configs:
      - targets: ['gate.<your-app>.up.railway.app:9090']

  - job_name: 'tsrpc_match'
    metrics_path: /metrics
    static_configs:
      - targets: ['match.<your-app>.up.railway.app:9091']

  - job_name: 'tsrpc_room'
    metrics_path: /metrics
    static_configs:
      - targets: ['room.<your-app>.up.railway.app:9092']
```

> **注意**：`targets` 应替换为 Railway 自动分配或自定义的服务域名（内部私网不可达），确保端口 909x 对外开放。如果部署在私有网络，可以使用服务间私网地址。

3. 保存配置后，重新部署 `prometheus` 服务。

---

## 4. Grafana 数据源与看板

1. 访问 `grafana` 服务的域名（第一次登录使用 `GF_SECURITY_ADMIN_USER / GF_SECURITY_ADMIN_PASSWORD`）。
2. 在 Grafana 中添加 Prometheus 数据源：
   - URL 指向 `http://prometheus.<your-app>.up.railway.app:9090`（或内部地址）
   - 保存并测试，确保连接成功。
3. 导入预置看板：
   - 文件位于仓库 `prometheus/grafana-dashboard.json`
   - 在 Grafana → “Dashboards → Import” 中上传 JSON 文件，选择刚添加的 Prometheus 数据源即可。

---

## 5. Loki / Tempo（可选）

模板已经包含 Loki（日志）与 Tempo（链路追踪）。如果需要采集 TSRPC 服务日志，可在服务的 Dockerfile 中配置 promtail 或直接使用 Railway 的 Log Drains 输出到 Loki。Tempo 的使用需要接入 OpenTelemetry SDK，如当前项目未集成可暂不配置。

---

## 6. 维护建议

1. **访问控制**：Grafana 默认开放外网，建议启用 Railway 的访问控制或在 Grafana 中开启 OAuth/LDAP 登录。
2. **指标压缩**：Prometheus 长期运行会累积数据，需要定期清理或使用外部存储（如 Thanos）。在开发阶段可以保留默认配置。
3. **报警**：如果希望在指标异常时收到通知，可在 Grafana 或 Prometheus 中配置 Alertmanager，并指向 Slack/Webhook 等渠道。

以上步骤完成后，Grafana Stack 就能实时展示 Gate/Match/Room 的延迟、QPS、错误率等数据，为后续部署与运维提供可视化支撑。
