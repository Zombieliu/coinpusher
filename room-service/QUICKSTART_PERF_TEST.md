# ⚡ 快速开始 - 云配置性能测试

## 1分钟快速测试

```bash
cd room-service

# 测试 4核8G 配置（最常见）
./perf-test-cloud-sim.sh 4c8g
```

## 3分钟完整测试

```bash
# 测试所有配置（2C4G, 4C8G, 8C16G）
./perf-test-cloud-sim.sh all

# 查看文本报告
python3 analyze-perf.py

# 生成HTML报告（可在浏览器查看）
python3 analyze-perf.py --html
open perf-report.html
```

## 5分钟深度分析

```bash
# 运行测试
./perf-test-cloud-sim.sh all

# 生成所有报告
python3 analyze-perf.py              # 终端文本报告
python3 analyze-perf.py --html       # HTML可视化报告
python3 analyze-perf.py --plot       # 生成性能图表（需要 matplotlib）

# 安装 matplotlib（如果需要图表）
pip3 install matplotlib

# 查看图表
open perf-charts.png
```

## 预期结果示例

### 终端输出
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 性能测试报告 - 4核8G
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  配置: 4核8G
  运行时间: 25.34s
  房间数量: 100
  总硬币数: 10000
  消息速率: 398.6 msg/s
  平均延迟: 2.45ms
  P95 延迟: 8.32ms ✅
  P99 延迟: 12.15ms
  错误次数: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 性能对比
```
配置         总硬币       消息/秒      平均延迟      P95延迟      错误率
────────────────────────────────────────────────────────────────────────
2核4G        2500         156.3        5.23ms       18.45ms      0.00%
4核8G        10000        398.6        2.45ms       8.32ms       0.00%
8核16G       30000        892.1        1.12ms       3.67ms       0.00%
```

## 结果解读

### ✅ 性能优秀（P95 < 10ms）
- **推荐用于生产环境**
- 可以安心部署
- 延迟低，用户体验好

### ⚠️ 性能良好（P95 10-50ms）
- **可用于生产，需预留余量**
- 建议保留20-30%性能余量
- 监控峰值负载

### ❌ 性能不足（P95 > 50ms）
- **不建议用于生产**
- 升级服务器配置
- 或优化代码性能

## 常见问题

### Q: Docker 未安装怎么办？
A: 访问 https://docs.docker.com/get-docker/ 安装

### Q: 测试失败了？
A: 检查端口是否被占用：
```bash
# 查看端口占用
lsof -i :9001
lsof -i :9002
lsof -i :9003

# 停止所有容器
docker-compose down
```

### Q: 如何只测试一个配置？
A:
```bash
./perf-test-cloud-sim.sh 4c8g   # 只测试 4核8G
./perf-test-cloud-sim.sh 8c16g  # 只测试 8核16G
./perf-test-cloud-sim.sh 2c4g   # 只测试 2核4G
```

### Q: 测试数据保存在哪里？
A: `perf-results/` 目录
- `*_results.json` - 性能指标
- `*_monitor.csv` - 资源监控数据

### Q: 如何清理测试数据？
A:
```bash
rm -rf perf-results/
docker system prune -a  # 清理Docker资源
```

## 下一步

1. ✅ 根据测试结果选择合适的服务器配置
2. ✅ 在真实云服务器上验证性能
3. ✅ 设置性能监控告警
4. ✅ 定期进行性能回归测试

## 获取帮助

- 📖 详细文档：`PERF_TESTING.md`
- 🐛 问题反馈：项目 Issues
- 💡 优化建议：查看 `PERF_TESTING.md` 中的优化章节
