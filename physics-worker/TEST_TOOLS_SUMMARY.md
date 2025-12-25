# 🛠️ 性能测试工具总览

## 快速参考

### 问题：502 错误？

```bash
# 一键清理和重置
./cleanup-and-reset.sh
```

### 问题：想测试服务器配置性能？

```bash
# 测试 CPU 和内存影响（不考虑网络）
./perf-test-cloud-sim.sh all
```

### 问题：想测试真实网络条件？

```bash
# 测试带宽、延迟、丢包影响
./perf-test-with-network.sh --preset china-telecom-5m
```

---

## 📚 工具列表

| 工具 | 测试内容 | 用途 |
|------|----------|------|
| **perf-test-cloud-sim.sh** | CPU + 内存 | 评估不同服务器配置 |
| **perf-test-with-network.sh** | 带宽 + 延迟 + 丢包 | 评估网络条件影响 |
| **stress-test.sh** | 基础压力测试 | 快速验证服务稳定性 |
| **analyze-perf.py** | 结果分析 | 生成报告和图表 |
| **cleanup-and-reset.sh** | 环境清理 | 解决 502、端口占用 |
| **fix-line-endings.sh** | 修复换行符 | 解决脚本执行错误 |

---

## 🎯 使用场景

### 场景 1: 选择云服务器配置

**目标：** 2C4G、4C8G、8C16G 选哪个？

```bash
# 测试所有配置
./perf-test-cloud-sim.sh all

# 查看报告
python3 analyze-perf.py
```

**查看指标：**
- P95 延迟 < 10ms = 优秀
- P95 延迟 10-50ms = 可用
- P95 延迟 > 50ms = 需升级

### 场景 2: 评估带宽需求

**目标：** 需要购买多少带宽？

```bash
# 测试不同带宽
./perf-test-with-network.sh --preset china-telecom-1m
./perf-test-with-network.sh --preset china-telecom-5m
./perf-test-with-network.sh --preset china-telecom-10m
```

**查看指标：**
- 消息速率（msg/s）
- 超时率（应 < 1%）
- 吞吐量是否满足需求

### 场景 3: 测试弱网稳定性

**目标：** 4G 用户能否正常游戏？

```bash
# 模拟 4G 网络
./perf-test-with-network.sh --preset mobile-4g

# 模拟弱网
./perf-test-with-network.sh --preset poor-network
```

**查看指标：**
- 超时率（应 < 5%）
- 错误率（应 < 1%）
- 快照频率（应 > 15Hz）

### 场景 4: 压力测试找极限

**目标：** 服务器能承载多少房间？

```bash
# 编辑脚本，逐步增加负载
# perf-test-cloud-sim.sh 中修改：
# ROOM_COUNT=200
# COINS_PER_ROOM=150

./perf-test-cloud-sim.sh 4c8g
```

**查看指标：**
- CPU 使用率（应 < 80%）
- 内存使用率（应 < 80%）
- 延迟是否显著增加

### 场景 5: 解决问题

**问题：** 测试失败、502 错误、端口占用

```bash
# 清理所有资源
./cleanup-and-reset.sh

# 重新测试
./perf-test-cloud-sim.sh 4c8g
```

---

## 📊 完整测试流程

### 步骤 1: 环境准备
```bash
# 确保 Docker 运行
docker --version

# 清理旧环境
./cleanup-and-reset.sh
```

### 步骤 2: 基础性能测试
```bash
# 测试 CPU/内存影响
./perf-test-cloud-sim.sh all
```

### 步骤 3: 网络性能测试
```bash
# 测试常见网络场景
./perf-test-with-network.sh --preset china-telecom-5m
./perf-test-with-network.sh --preset mobile-4g
```

### 步骤 4: 分析结果
```bash
# 文本报告
python3 analyze-perf.py

# HTML 报告
python3 analyze-perf.py --html
open perf-report.html

# 性能图表（需要 matplotlib）
pip3 install matplotlib
python3 analyze-perf.py --plot
open perf-charts.png
```

### 步骤 5: 决策

根据测试结果：
- ✅ **P95 < 10ms** → 可以上线
- ⚠️ **P95 10-50ms** → 可用，建议预留余量
- ❌ **P95 > 50ms** → 需要优化或升级配置

---

## 🎓 核心概念

### 测试维度

| 维度 | 说明 | 工具 |
|------|------|------|
| **计算性能** | CPU 处理能力 | perf-test-cloud-sim.sh |
| **内存容量** | 内存使用和限制 | perf-test-cloud-sim.sh |
| **网络带宽** | 数据传输速率 | perf-test-with-network.sh |
| **网络延迟** | 往返时间 (RTT) | perf-test-with-network.sh |
| **网络稳定** | 丢包率 | perf-test-with-network.sh |

### 关键指标

| 指标 | 含义 | 优秀标准 |
|------|------|----------|
| **P50 延迟** | 50% 请求的延迟 | < 5ms |
| **P95 延迟** | 95% 请求的延迟 | < 10ms |
| **P99 延迟** | 99% 请求的延迟 | < 20ms |
| **吞吐量** | 每秒处理消息数 | > 300/s |
| **错误率** | 失败请求百分比 | < 0.1% |
| **超时率** | 超时请求百分比 | < 0.5% |
| **CPU 使用** | CPU 占用百分比 | < 70% |
| **内存使用** | 内存占用百分比 | < 70% |

---

## 🚀 高级用法

### 自定义测试参数

编辑脚本修改：
- **房间数量** (ROOM_COUNT)
- **每房间硬币数** (COINS_PER_ROOM)
- **投币间隔** (DROP_INTERVAL)

### Docker 手动调试

```bash
# 启动容器
docker run -it --rm \
    --cpus=4.0 \
    --memory=8g \
    --cap-add=NET_ADMIN \
    -p 9000:9000 \
    room-service:latest

# 进入容器
docker exec -it <container-id> bash

# 查看网络配置
tc qdisc show dev eth0

# 查看进程
ps aux | grep room-service
```

### 真实云服务器测试

```bash
# SSH 到云服务器
ssh user@your-server

# 上传测试脚本
scp stress-test.sh user@your-server:~/

# 在服务器上运行
./stress-test.sh
```

---

## 📖 文档索引

- **QUICKSTART_PERF_TEST.md** - 1分钟快速开始
- **PERF_TESTING.md** - CPU/内存测试详细指南
- **NETWORK_TESTING.md** - 网络测试详细指南（含带宽、延迟、丢包）
- **TEST_TOOLS_SUMMARY.md** - 本文档，工具总览
- **TROUBLESHOOTING.md** - 故障排查（项目根目录）

---

## ✅ 检查清单

开始测试前：
- [ ] Docker 已安装并运行
- [ ] 端口 9000-9020 未被占用
- [ ] Python 3.6+ 已安装
- [ ] 脚本有执行权限（chmod +x）

测试完成后：
- [ ] 查看性能报告
- [ ] 对比不同配置结果
- [ ] 记录基线数据
- [ ] 在真实环境验证

---

## 🎉 快速命令参考

```bash
# 清理环境
./cleanup-and-reset.sh

# CPU/内存测试
./perf-test-cloud-sim.sh all

# 网络测试
./perf-test-with-network.sh --preset china-telecom-5m

# 生成报告
python3 analyze-perf.py --html

# 查看结果
open perf-report.html
```

---

**现在你已经掌握了完整的性能测试工具链！** 🎓

有问题？查看对应的详细文档或运行 `./cleanup-and-reset.sh` 重置环境。
