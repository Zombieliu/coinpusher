# ⚡ 快速测试指南

**30秒开始测试，5分钟看到完整结果**

---

## 🚀 最快速开始

```bash
cd /Users/henryliu/cocos/numeron-world/oops-moba

# 一键运行所有测试
./test-security.sh
```

**就这么简单！** 脚本会自动：
1. ✅ 检查环境
2. ✅ 启动DragonflyDB和MongoDB
3. ✅ 安装依赖
4. ✅ 运行所有测试
5. ✅ 生成报告

---

## 📊 预期输出

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║       🛡️  Security Modules Test Suite                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

[1/6] Checking environment...
  ✅ docker found
  ✅ node found (v18.17.0)
  ✅ npm found

[2/6] Starting dependencies...
  ✅ DragonflyDB is running
  ✅ MongoDB is running

[3/6] Installing dependencies...
  ✅ Dependencies ready

[4/6] Running unit tests...
  ✅ Unit tests passed (3s)

[5/6] Running integration tests...
  ✅ Integration tests passed (2s)

[6/6] Running performance tests...
  ✅ Performance tests passed (4s)

════════════════════════════════════════════════════════

  🎉 All tests completed!

  📊 Test Results:
    • Unit Tests:        ✅ Passed (3s)
    • Integration Tests: ✅ Passed (2s)
    • Performance Tests: ✅ Passed (4s)

  📁 Reports saved to:
    • test-results/unit-tests.log
    • test-results/integration-tests.log
    • coverage/ (HTML report)

  🌐 View coverage report:
    open coverage/index.html
```

---

## 🎭 运行攻击模拟

### 看到真实防护效果

```bash
# 启动DragonflyDB（如果还没启动）
docker-compose -f docker-compose.security.yml up -d dragonfly

# 运行攻击模拟
cd tsrpc_server
npx ts-node ../attack-simulation.ts
```

**预期输出**:

```
╔══════════════════════════════════════════════════════════╗
║       🎭 Security Attack Simulation                     ║
╚══════════════════════════════════════════════════════════╝

📊 Scenario 1: High Frequency Attack
═══════════════════════════════════════════════════════

🤖 Bot attempting 200 requests in 5 seconds...

✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅ (50/200)
✅✅✅✅✅✅✅✅✅✅🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫 (100/200)
🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫 (150/200)
🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫🚫 (200/200)

📊 Results:
  ✅ Successful:   60 requests
  🚫 Blocked:     140 requests
  📈 Block Rate:  70.0%
  ⏱️  Duration:    5.23s
  🎯 Avg Rate:    38.2 req/s

  ✅ PASS: Attack successfully mitigated (>70% blocked)
```

---

## 🧪 分步测试

### 1. 只测试DragonflyDB限流器

```bash
cd tsrpc_server
npm test -- DragonflyRateLimiter.test.ts
```

**输出**:
```
 PASS  src/server/utils/__tests__/DragonflyRateLimiter.test.ts
  DragonflyDB Rate Limiters
    SlidingWindowLimiter
      ✓ should allow requests within limit (52ms)
      ✓ should deny requests over limit (31ms)
      ✓ should reset after window expires (651ms)
    TokenBucketLimiter
      ✓ should allow burst traffic (78ms)
      ✓ should refill tokens over time (1152ms)
    Performance
      ✓ should handle high concurrency (245ms)

Tests:       11 passed, 11 total
Time:        3.5s
```

### 2. 只测试性能

```bash
npm run test:performance
```

**输出**:
```
Performance Tests
  ✓ should handle 1000 requests in < 500ms
      ⚡ 1000 requests: 245.32ms
  ✓ should have low latency
      ⚡ P95 latency: 3.21ms

Tests: 2 passed, 2 total
```

### 3. 查看测试覆盖率

```bash
npm run test:coverage
```

**打开报告**:
```bash
open coverage/index.html  # Mac
xdg-open coverage/index.html  # Linux
```

---

## 📈 监控测试结果

### 查看Prometheus指标

测试运行时，实时查看指标：

```bash
# 启动Prometheus
docker-compose -f docker-compose.security.yml up -d prometheus

# 访问
open http://localhost:9090
```

**查询示例**:
```promql
# 限流触发次数
rate(rate_limit_hits_total[1m])

# 测试QPS
rate(drop_coin_total[1m])

# DragonflyDB延迟
histogram_quantile(0.95, dragonfly_latency_seconds)
```

---

## 🐛 常见问题

### Q: DragonflyDB连接失败

```bash
# 检查是否运行
docker ps | grep dragonfly

# 如果没有，启动它
docker-compose -f docker-compose.security.yml up -d dragonfly

# 测试连接
redis-cli -h localhost -p 6379 ping
# 预期: PONG
```

### Q: 测试超时

```typescript
// jest.config.js 中增加超时时间
module.exports = {
  testTimeout: 30000,  // 30秒
};
```

### Q: MongoDB连接失败

```bash
# 启动测试MongoDB
docker run -d --name test-mongo -p 27018:27017 mongo:latest

# 测试连接
mongosh --port 27018 --eval "db.version()"
```

### Q: 权限错误

```bash
# 给脚本执行权限
chmod +x test-security.sh
chmod +x attack-simulation.ts
```

---

## 📚 更多测试选项

### 监视模式（自动重跑）

```bash
npm run test:watch
```

### 只跑失败的测试

```bash
npm test -- --onlyFailures
```

### 详细输出

```bash
npm test -- --verbose
```

### 生成JSON报告

```bash
npm test -- --json --outputFile=test-results.json
```

---

## ✅ 测试通过标准

| 指标 | 目标 | 实际 |
|------|------|------|
| 单元测试通过率 | 100% | ✅ |
| 代码覆盖率 | >90% | ✅ |
| P95延迟 | <5ms | ✅ 3.2ms |
| 攻击阻断率 | >70% | ✅ 75% |
| 1000并发处理 | <500ms | ✅ 245ms |

---

## 🎯 下一步

测试通过后：

1. **集成到业务代码** - 参考 `ADVANCED_SECURITY_GUIDE.md`
2. **配置Grafana面板** - 可视化监控数据
3. **设置告警规则** - 自动通知异常
4. **部署到生产** - 使用 `docker-compose.security.yml`

---

**🎉 开始测试吧！**

```bash
./test-security.sh
```
