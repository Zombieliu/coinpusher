# 🌩️ 云服务器配置模拟性能测试

## 概述

本工具通过 Docker 容器资源限制，模拟不同云服务器配置下的性能表现，帮助你：
- 📊 评估不同配置的承载能力
- 💰 选择最合适的服务器规格
- 🎯 发现性能瓶颈
- 📈 生成性能对比报告

## 前置要求

```bash
# 安装 Docker
https://docs.docker.com/get-docker/

# 安装 docker-compose
https://docs.docker.com/compose/install/

# 验证安装
docker --version
docker-compose --version
```

## 支持的配置

| 配置 | CPU | 内存 | 端口 | 测试场景 |
|------|-----|------|------|----------|
| **2c4g** | 2核 | 4GB | 9003 | 最低配置测试（50房间×50币）|
| **4c8g** | 4核 | 8GB | 9001 | 入门云服务器（100房间×100币）|
| **8c16g** | 8核 | 16GB | 9002 | 标准云服务器（200房间×150币）|

## 快速开始

### 1. 测试单个配置

```bash
# 测试 4核8G 配置
cd room-service
./perf-test-cloud-sim.sh 4c8g

# 测试 8核16G 配置
./perf-test-cloud-sim.sh 8c16g

# 测试 2核4G 配置
./perf-test-cloud-sim.sh 2c4g
```

### 2. 测试所有配置（推荐）

```bash
# 自动测试所有配置并生成对比报告
./perf-test-cloud-sim.sh all
```

## 测试流程

1. **构建 Docker 镜像** - 编译 Release 版本的 Rust 服务
2. **启动容器** - 应用 CPU 和内存限制
3. **资源监控** - 实时监控 CPU、内存使用情况
4. **压力测试** - 创建多个房间，投放大量金币
5. **收集指标** - 延迟、吞吐量、错误率等
6. **生成报告** - JSON 和 CSV 格式的详细数据

## 测试结果

### 输出目录结构

```
perf-results/
├── 2c4g_results.json      # 2C4G 测试结果
├── 2c4g_monitor.csv       # 2C4G 资源监控数据
├── 4c8g_results.json      # 4C8G 测试结果
├── 4c8g_monitor.csv       # 4C8G 资源监控数据
├── 8c16g_results.json     # 8C16G 测试结果
└── 8c16g_monitor.csv      # 8C16G 资源监控数据
```

### 结果示例

**测试报告（终端输出）：**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 性能测试报告 - 4核8G
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  配置: 4核8G
  运行时间: 25.34s
  房间数量: 100
  总硬币数: 10000
  发送消息: 10100
  接收消息: 3000
  快照数量: 3000
  错误次数: 0
  消息速率: 398.6 msg/s
  平均延迟: 2.45ms
  P95 延迟: 8.32ms
  P99 延迟: 12.15ms
  快照硬币数: 95 (平均)
  快照频率: 30.2 Hz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**性能对比（测试所有配置后）：**
```
配置         总硬币       消息/秒      平均延迟      P95延迟      错误率
────────────────────────────────────────────────────────────────────────
2核4G        2500         156.3        5.23ms       18.45ms      0.00%
4核8G        10000        398.6        2.45ms       8.32ms       0.00%
8核16G       30000        892.1        1.12ms       3.67ms       0.00%

建议:
✅ 8核16G: 性能优秀，延迟低于10ms
✅ 4核8G: 性能优秀，延迟低于10ms
⚠️  2核4G: 性能良好，但在高负载下可能有压力
```

### JSON 结果文件

```json
{
  "profile": "4c8g",
  "config": "4核8G",
  "elapsed": 25.34,
  "room_count": 100,
  "coins_per_room": 100,
  "total_coins": 10000,
  "messages_sent": 10100,
  "messages_received": 3000,
  "snapshots": 3000,
  "errors": 0,
  "msg_per_sec": 398.6,
  "avg_latency": 2.45,
  "p95_latency": 8.32,
  "p99_latency": 12.15
}
```

### 资源监控 CSV

```csv
timestamp,cpu_percent,memory_mb,memory_percent
1701234567,45.23,512.5,6.25
1701234568,52.18,548.2,6.85
1701234569,48.90,532.1,6.65
...
```

## 高级用法

### 自定义测试配置

编辑 `perf-test-cloud-sim.sh` 中的配置：

```bash
# 配置映射：配置名,端口,房间数,每房间硬币数
CONFIGS[4c8g]="4核8G,9001,100,100"

# 修改为更激进的测试
CONFIGS[4c8g]="4核8G,9001,200,150"  # 200房间 × 150币
```

### 手动启动容器

```bash
# 启动 4核8G 容器
docker-compose --profile 4c8g up -d

# 查看日志
docker-compose --profile 4c8g logs -f

# 停止
docker-compose --profile 4c8g down
```

### 实时监控

```bash
# 监控容器资源
docker stats room-service-4c8g

# 查看容器进程
docker top room-service-4c8g

# 进入容器
docker exec -it room-service-4c8g bash
```

## 数据分析

### 使用 Python 分析监控数据

```python
import pandas as pd
import matplotlib.pyplot as plt

# 读取监控数据
df = pd.read_csv('perf-results/4c8g_monitor.csv')

# 绘制 CPU 使用率
plt.figure(figsize=(12, 6))
plt.subplot(1, 2, 1)
plt.plot(df['cpu_percent'])
plt.title('CPU Usage Over Time')
plt.ylabel('CPU %')

# 绘制内存使用
plt.subplot(1, 2, 2)
plt.plot(df['memory_mb'])
plt.title('Memory Usage Over Time')
plt.ylabel('Memory (MB)')

plt.tight_layout()
plt.savefig('resource_usage.png')
```

### 使用 jq 分析 JSON 结果

```bash
# 提取所有配置的 P95 延迟
jq '.p95_latency' perf-results/*_results.json

# 比较消息吞吐量
jq '{config: .config, msg_per_sec: .msg_per_sec}' perf-results/*_results.json

# 找出最佳配置
jq -s 'sort_by(.p95_latency) | .[0]' perf-results/*_results.json
```

## 性能指标解读

### 关键指标

| 指标 | 说明 | 优秀标准 | 可接受标准 |
|------|------|----------|------------|
| **平均延迟** | 消息处理平均时间 | < 5ms | < 20ms |
| **P95延迟** | 95%请求的延迟 | < 10ms | < 50ms |
| **P99延迟** | 99%请求的延迟 | < 20ms | < 100ms |
| **消息速率** | 每秒处理消息数 | > 500/s | > 200/s |
| **错误率** | 失败请求百分比 | 0% | < 0.1% |
| **快照频率** | 游戏状态更新频率 | 30 Hz | 20 Hz |

### CPU 使用率

- **< 50%** - 资源充足，可增加负载
- **50-80%** - 正常使用，有扩展空间
- **> 80%** - 接近瓶颈，考虑扩容

### 内存使用率

- **< 60%** - 健康状态
- **60-80%** - 正常使用
- **> 80%** - 需要监控，可能影响性能

## 故障排查

### 容器启动失败

```bash
# 查看构建日志
docker-compose build

# 查看容器日志
docker-compose --profile 4c8g logs

# 检查端口占用
lsof -i :9001
```

### 测试脚本失败

```bash
# 检查 Python 版本（需要 3.6+）
python3 --version

# 手动测试连接
telnet 127.0.0.1 9001

# 查看容器状态
docker ps -a | grep room-service
```

### 性能异常

1. **延迟过高** - 检查 CPU 使用率，可能需要更高配置
2. **内存不足** - 增加容器内存限制
3. **快照丢失** - 检查网络缓冲区，增加接收缓冲
4. **错误率高** - 查看容器日志，可能是资源耗尽

## 与真实云服务器对比

### Docker 容器限制 vs 真实服务器

**优点：**
- ✅ 快速测试，无需购买服务器
- ✅ 完全可重复
- ✅ 成本为零
- ✅ 可以在开发机上运行

**限制：**
- ⚠️ 网络性能可能不同（容器网络 vs 真实网络）
- ⚠️ 磁盘 I/O 共享宿主机
- ⚠️ CPU 可能受宿主机其他进程影响

**建议：**
- 用 Docker 测试进行**初步评估**
- 最终在**真实云服务器**上验证
- 预留 **20-30%** 的性能余量

## 云服务器推荐

根据测试结果选择云服务器：

| 预期负载 | 推荐配置 | 云服务商参考 |
|----------|----------|--------------|
| **小型游戏**（< 50 并发房间）| 2C4G | 腾讯云/阿里云 轻量服务器 |
| **中型游戏**（50-200 并发房间）| 4C8G | 腾讯云 SA2/阿里云 c6 |
| **大型游戏**（200-500 并发房间）| 8C16G | 腾讯云 SA2/阿里云 c6 |
| **超大型**（> 500 并发房间）| 16C32G+ | 腾讯云 SA3/阿里云 c7 |

## 进一步优化

### 代码优化建议

1. **启用 LTO（链接时优化）**
   ```toml
   # Cargo.toml
   [profile.release]
   lto = true
   codegen-units = 1
   ```

2. **使用 jemalloc 内存分配器**
   ```rust
   #[global_allocator]
   static GLOBAL: jemallocator::Jemalloc = jemallocator::Jemalloc;
   ```

3. **调整 Tokio 运行时**
   ```rust
   tokio::runtime::Builder::new_multi_thread()
       .worker_threads(4)  // 根据 CPU 核心数调整
       .build()
   ```

### 容器优化

```yaml
# docker-compose.yml
services:
  room-service-4c8g:
    # ... 其他配置 ...
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    sysctls:
      - net.core.somaxconn=4096
      - net.ipv4.tcp_tw_reuse=1
```

## 总结

这套工具可以帮助你：
1. ✅ **快速评估**不同配置的性能
2. ✅ **节省成本**，避免过度配置
3. ✅ **发现瓶颈**，指导优化方向
4. ✅ **制定预算**，准确预估服务器成本

下一步：在真实云服务器上验证测试结果！
