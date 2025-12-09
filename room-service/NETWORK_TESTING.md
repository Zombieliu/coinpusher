# 🌐 网络条件性能测试完整指南

## ⚠️ 之前遗漏的关键因素

原始测试方案（`perf-test-cloud-sim.sh`）只考虑了 **CPU 和内存**，但真实云服务器还受以下因素影响：

### 1. 网络带宽限制 ⭐⭐⭐⭐⭐
**影响最大！**

| 云服务商 | 默认带宽 | 典型配置 |
|----------|----------|----------|
| 腾讯云 | 1-5 Mbps | 4C8G 通常 5Mbps |
| 阿里云 | 1-5 Mbps | 按流量或固定带宽 |
| AWS | 按实例类型 | t3.medium ~5Gbps (burst) |
| Azure | 按实例类型 | B2s ~0.75Gbps |

**问题：** Docker 本地测试走 `localhost`，带宽接近无限（> 10Gbps）

### 2. 网络延迟 ⭐⭐⭐⭐
| 场景 | 延迟 |
|------|------|
| 本地测试 | < 1ms |
| 同城 | 10-30ms |
| 同省 | 20-50ms |
| 跨省 | 50-100ms |
| 跨国 | 100-300ms |

### 3. 丢包率 ⭐⭐⭐
| 网络质量 | 丢包率 |
|----------|--------|
| 优质专线 | < 0.1% |
| 普通宽带 | 0.2-0.5% |
| 4G/5G | 0.5-2% |
| 弱网 | 2-10% |

### 4. 并发连接数 ⭐⭐⭐
- **文件描述符限制**：默认 1024，可能需要调整到 65535
- **TCP 连接数上限**：受系统参数限制
- **TIME_WAIT 连接**：可能耗尽端口

### 5. 磁盘 I/O ⭐⭐
- **日志写入**：高频日志可能成为瓶颈
- **持久化存储**：如果有数据库或文件存储

### 6. 地理位置 ⭐⭐
- **CDN/负载均衡**：多节点部署
- **DNS 解析时间**

---

## 🚀 新增网络模拟测试工具

### 工具：`perf-test-with-network.sh`

使用 Linux `tc` (Traffic Control) 在容器内模拟真实网络条件。

### 预设场景

```bash
# 1. 电信 5Mbps 宽带（最常见）
./perf-test-with-network.sh --preset china-telecom-5m

# 2. 移动 4G 网络
./perf-test-with-network.sh --preset mobile-4g

# 3. 跨地域访问（如北京访问广州服务器）
./perf-test-with-network.sh --preset cross-region

# 4. 弱网环境（模拟恶劣条件）
./perf-test-with-network.sh --preset poor-network
```

### 自定义网络条件

```bash
# 自定义带宽、延迟、丢包率
./perf-test-with-network.sh \
    --bandwidth 3mbit \
    --latency 50ms \
    --loss 1%
```

### 完整预设列表

| 预设名称 | 带宽 | 延迟 | 丢包率 | 场景说明 |
|----------|------|------|--------|----------|
| `local` | 1000Mbps | 0ms | 0% | 本地测试（无限制）|
| `china-telecom-1m` | 1Mbps | 30ms | 0.5% | 电信 1M 宽带 |
| `china-telecom-5m` | 5Mbps | 20ms | 0.2% | 电信 5M 宽带 ⭐ 推荐 |
| `china-telecom-10m` | 10Mbps | 15ms | 0.1% | 电信 10M 宽带 |
| `china-unicom-5m` | 5Mbps | 25ms | 0.3% | 联通 5M 宽带 |
| `mobile-4g` | 20Mbps | 40ms | 1% | 移动 4G 网络 |
| `mobile-5g` | 100Mbps | 10ms | 0.1% | 移动 5G 网络 |
| `cross-region` | 10Mbps | 100ms | 0.5% | 跨地域访问 |
| `poor-network` | 2Mbps | 150ms | 3% | 弱网环境 |

---

## 📊 完整测试矩阵

### 推荐测试组合

#### 1️⃣ 基础性能测试（CPU/内存）
```bash
# 测试不同服务器配置的计算能力
./perf-test-cloud-sim.sh all
```

**测试内容：**
- ✅ CPU 处理能力
- ✅ 内存使用
- ✅ 本地网络吞吐量
- ❌ **不包含真实网络限制**

#### 2️⃣ 网络性能测试（带宽/延迟/丢包）
```bash
# 测试网络条件对性能的影响
./perf-test-with-network.sh --preset china-telecom-5m
./perf-test-with-network.sh --preset mobile-4g
./perf-test-with-network.sh --preset cross-region
```

**测试内容：**
- ✅ 带宽限制影响
- ✅ 延迟影响
- ✅ 丢包影响
- ✅ 超时率
- ✅ 连接建立时间

#### 3️⃣ 综合测试（推荐生产前）
组合 CPU/内存 + 网络条件

```bash
# 例如：4C8G + 5Mbps 带宽
# 1. 先启动资源受限的容器（手动）
docker run -d \
    --name room-service-full-test \
    --cpus=4.0 \
    --memory=8g \
    --cap-add=NET_ADMIN \
    -p 9030:9000 \
    room-service:latest

# 2. 应用网络限制
docker exec room-service-full-test tc qdisc add dev eth0 root handle 1: htb default 12
docker exec room-service-full-test tc class add dev eth0 parent 1: classid 1:1 htb rate 5mbit
docker exec room-service-full-test tc class add dev eth0 parent 1:1 classid 1:12 htb rate 5mbit
docker exec room-service-full-test tc qdisc add dev eth0 parent 1:12 handle 10: netem delay 20ms loss 0.2%

# 3. 运行压力测试（修改 PORT=9030）
python3 stress-test.py --port 9030
```

---

## 🎯 测试策略建议

### 阶段 1：基线测试（无限制）
```bash
# 了解服务的理论最大性能
./perf-test-cloud-sim.sh 4c8g
```

**目标：** 确定理论上限（延迟、吞吐量）

### 阶段 2：真实网络测试
```bash
# 模拟真实云服务器网络
./perf-test-with-network.sh --preset china-telecom-5m
```

**目标：** 评估网络对性能的影响

### 阶段 3：压力测试
```bash
# 逐步增加负载，找到临界点
# 修改 ROOM_COUNT 和 COINS_PER_ROOM
```

**目标：** 找到服务承载极限

### 阶段 4：弱网测试
```bash
# 测试恶劣条件下的表现
./perf-test-with-network.sh --preset poor-network
```

**目标：** 确保服务稳定性

---

## 📈 性能指标对比

### 预期结果示例

| 场景 | 配置 | 带宽 | P95延迟 | 吞吐量 | 超时率 |
|------|------|------|---------|--------|--------|
| 基线 | 4C8G | 无限 | 8ms | 400 msg/s | 0% |
| 电信5M | 4C8G | 5Mbps | 25ms | 350 msg/s | 0.1% |
| 跨地域 | 4C8G | 10Mbps | 120ms | 300 msg/s | 0.5% |
| 弱网 | 4C8G | 2Mbps | 200ms | 80 msg/s | 3% |

### 分析要点

1. **延迟增加** - 网络延迟直接叠加到消息延迟
2. **吞吐量下降** - 带宽限制导致消息排队
3. **超时率上升** - 丢包和延迟导致超时
4. **连接时间** - 网络条件影响握手时间

---

## 🔧 故障排查

### 问题 1: 502 Bad Gateway
**原因：**
- 容器启动失败
- 端口未正确映射
- Rust 服务崩溃

**解决：**
```bash
# 1. 清理环境
./cleanup-and-reset.sh

# 2. 查看容器日志
docker logs room-service-nettest

# 3. 检查端口
lsof -i :9020

# 4. 重新构建
docker build -t room-service:latest .
```

### 问题 2: tc 命令失败
**原因：** 容器缺少 `NET_ADMIN` 权限

**解决：**
```bash
# 确保容器启动时添加 --cap-add=NET_ADMIN
docker run --cap-add=NET_ADMIN ...
```

### 问题 3: 测试超时
**原因：** 网络限制过于严格

**解决：**
```python
# 调整超时时间
sock.settimeout(10.0)  # 增加到 10 秒
```

### 问题 4: 连接被拒绝
**原因：** 服务未启动或端口映射错误

**解决：**
```bash
# 检查服务状态
docker ps
docker exec room-service-nettest ps aux | grep room-service

# 检查端口监听
docker exec room-service-nettest netstat -tlnp
```

---

## 💡 优化建议

### 1. 带宽优化
- **减少消息大小**：压缩 JSON、使用二进制协议（如 MessagePack、Protobuf）
- **批量发送**：合并多个小消息
- **增量更新**：只发送变化的数据

### 2. 延迟优化
- **减少往返次数**：批处理、管道化
- **异步处理**：不阻塞主线程
- **预取数据**：提前加载

### 3. 丢包处理
- **重试机制**：自动重传
- **超时策略**：合理设置超时时间
- **降级方案**：弱网下减少更新频率

### 4. 连接优化
- **连接池**：复用 TCP 连接
- **Keep-Alive**：保持长连接
- **快速失败**：及时检测断开

---

## 🎓 最佳实践

### ✅ DO（推荐）
1. **测试多种场景**：不只测试理想情况
2. **记录基线**：保存每次测试结果对比
3. **压力测试**：找到服务承载极限
4. **监控资源**：观察 CPU、内存、网络使用
5. **真实验证**：最终在真实云服务器上验证

### ❌ DON'T（避免）
1. **只测试本地**：网络差异巨大
2. **忽略弱网**：部分用户可能在弱网环境
3. **过度自信**：预留 20-30% 性能余量
4. **忽略错误率**：0.1% 错误率在高并发下很严重

---

## 📝 测试清单

- [ ] 基础性能测试（CPU/内存）
  - [ ] 2C4G 配置
  - [ ] 4C8G 配置
  - [ ] 8C16G 配置

- [ ] 网络性能测试
  - [ ] 电信 5Mbps 场景
  - [ ] 移动 4G 场景
  - [ ] 跨地域场景
  - [ ] 弱网场景

- [ ] 压力测试
  - [ ] 逐步增加房间数
  - [ ] 逐步增加硬币数
  - [ ] 找到临界点

- [ ] 真实环境验证
  - [ ] 云服务器部署
  - [ ] 真实用户测试
  - [ ] 生产监控

---

## 🎉 总结

完整的性能测试需要考虑：

| 因素 | 重要性 | 测试工具 |
|------|--------|----------|
| **CPU** | ⭐⭐⭐⭐⭐ | `perf-test-cloud-sim.sh` |
| **内存** | ⭐⭐⭐⭐ | `perf-test-cloud-sim.sh` |
| **带宽** | ⭐⭐⭐⭐⭐ | `perf-test-with-network.sh` |
| **延迟** | ⭐⭐⭐⭐ | `perf-test-with-network.sh` |
| **丢包** | ⭐⭐⭐ | `perf-test-with-network.sh` |
| **并发** | ⭐⭐⭐ | 调整测试参数 |
| **磁盘 I/O** | ⭐⭐ | 日志压力测试 |

**现在你有了完整的测试工具链！** 🚀
