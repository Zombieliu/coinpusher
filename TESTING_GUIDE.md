# 🧪 安全模块测试完整指南

**从零到完整测试的全流程**

---

## 📋 测试层级

```
1️⃣ 单元测试 (Unit Tests)          - 测试单个函数/类
2️⃣ 集成测试 (Integration Tests)   - 测试模块间协作
3️⃣ 端到端测试 (E2E Tests)         - 测试完整业务流程
4️⃣ 性能测试 (Performance Tests)   - 测试性能指标
5️⃣ 实战演练 (Real-world Scenarios) - 模拟真实攻击
```

---

## 🚀 快速开始（5分钟）

### 一键运行所有测试

```bash
cd /Users/henryliu/cocos/numeron-world/oops-moba

# 运行完整测试套件
./test-security.sh

# 或分步执行
npm test                    # 单元测试
npm run test:integration    # 集成测试
npm run test:e2e           # 端到端测试
npm run test:performance   # 性能测试
```

---

## 1️⃣ 单元测试

### 测试 DragonflyDB 限流器

```bash
cd tsrpc_server

# 安装测试依赖
npm install --save-dev jest @types/jest ts-jest ioredis

# 配置 jest
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
EOF

# 运行测试
npm test -- DragonflyRateLimiter.test.ts
```

**预期输出**:
```
 PASS  src/server/utils/__tests__/DragonflyRateLimiter.test.ts
  ✓ should allow requests within limit (50ms)
  ✓ should deny requests over limit (30ms)
  ✓ should reset after window expires (650ms)
  ✓ Token Bucket allows burst traffic (80ms)
  ✓ Leaky Bucket enforces constant rate (60ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        3.5s
Coverage:    95.2%
```

### 测试设备指纹服务

创建测试文件：
```typescript
// tsrpc_server/src/server/gate/bll/__tests__/DeviceFingerprintService.test.ts

import { DeviceFingerprintService } from '../DeviceFingerprintService';
import { MongoClient } from 'mongodb';

describe('DeviceFingerprintService', () => {
    let mongoClient: MongoClient;

    beforeAll(async () => {
        // 连接测试数据库
        mongoClient = await MongoClient.connect('mongodb://localhost:27017/test');
        await DeviceFingerprintService.init(mongoClient.db('test'));
    });

    afterAll(async () => {
        await mongoClient.close();
    });

    beforeEach(async () => {
        // 清空测试数据
        await DeviceFingerprintService['collection'].deleteMany({});
    });

    test('should generate consistent hash', () => {
        const fingerprint = {
            canvasFingerprint: 'abc123',
            webGLFingerprint: 'def456',
            audioFingerprint: 'ghi789',
            // ... 其他字段
        };

        const hash1 = DeviceFingerprintService.generateHash(fingerprint);
        const hash2 = DeviceFingerprintService.generateHash(fingerprint);

        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA256 = 64 hex chars
    });

    test('should record fingerprint', async () => {
        const fingerprint = { /* ... */ };
        const hash = await DeviceFingerprintService.recordFingerprint(
            'user1',
            fingerprint as any,
            '192.168.1.1'
        );

        expect(hash).toBeDefined();

        const devices = await DeviceFingerprintService.getUserDevices('user1');
        expect(devices).toHaveLength(1);
        expect(devices[0].ipAddress).toBe('192.168.1.1');
    });

    test('should detect suspicious account', async () => {
        const fingerprint = { /* ... */ };
        const hash = DeviceFingerprintService.generateHash(fingerprint as any);

        // 同一设备注册多个账号
        await DeviceFingerprintService.recordFingerprint('user1', fingerprint as any, '1.1.1.1');
        await DeviceFingerprintService.recordFingerprint('user2', fingerprint as any, '1.1.1.1');
        await DeviceFingerprintService.recordFingerprint('user3', fingerprint as any, '1.1.1.1');

        const detection = await DeviceFingerprintService.detectSuspiciousAccount(
            'user4',
            hash,
            '1.1.1.1'
        );

        expect(detection.isSuspicious).toBe(true);
        expect(detection.riskScore).toBeGreaterThan(50);
        expect(detection.relatedUsers).toHaveLength(3);
    });
});
```

运行：
```bash
npm test -- DeviceFingerprintService.test.ts
```

### 测试欺诈评分引擎

```typescript
// tsrpc_server/src/server/gate/bll/__tests__/FraudDetectionEngine.test.ts

import { FraudDetectionEngine } from '../FraudDetectionEngine';

describe('FraudDetectionEngine', () => {
    test('should calculate low score for normal user', async () => {
        // Mock正常用户数据
        const result = await FraudDetectionEngine.calculateFraudScore('normal_user');

        expect(result.score).toBeLessThan(30);
        expect(result.level).toBe('low');
        expect(result.recommendation).toBe('allow');
    });

    test('should calculate high score for bot-like behavior', async () => {
        // Mock机器人数据（需要预先插入交易记录）
        const result = await FraudDetectionEngine.calculateFraudScore('bot_user');

        expect(result.score).toBeGreaterThan(70);
        expect(result.level).toBe('high');
        expect(result.recommendation).toBe('restrict');
        expect(result.reasons).toContainEqual(
            expect.objectContaining({ rule: 'too_regular_pattern' })
        );
    });

    test('should auto-ban users with score > 80', async () => {
        const result = await FraudDetectionEngine.autoModerate('suspected_cheater');

        expect(result.action).toBe('ban');
        expect(result.score).toBeGreaterThan(80);
    });
});
```

---

## 2️⃣ 集成测试

### 测试完整投币流程 + 限流

```typescript
// tsrpc_server/src/server/__tests__/integration/DropCoin.integration.test.ts

import { DragonflyClientManager, SlidingWindowLimiter } from '../../utils/DragonflyRateLimiter';
import { Metrics } from '../../utils/PrometheusMetrics';
import { ApiDropCoin } from '../../room/api/game/ApiDropCoin';

describe('Drop Coin Integration', () => {
    let dragonflyClient: any;
    let limiter: SlidingWindowLimiter;

    beforeAll(async () => {
        dragonflyClient = DragonflyClientManager.initialize({
            host: 'localhost',
            port: 6379
        });
        limiter = new SlidingWindowLimiter(dragonflyClient, 'test_drop', 5, 1000);
    });

    afterAll(async () => {
        await DragonflyClientManager.disconnect();
    });

    beforeEach(async () => {
        await dragonflyClient.flushdb();
    });

    test('should allow requests within limit', async () => {
        for (let i = 0; i < 5; i++) {
            const result = await limiter.tryAcquire('user1');
            expect(result.allowed).toBe(true);
        }

        // 第6次应该被拒绝
        const result = await limiter.tryAcquire('user1');
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should record metrics correctly', async () => {
        const before = await Metrics.dropCoinTotal['get']();

        await limiter.tryAcquire('user2');

        const after = await Metrics.dropCoinTotal['get']();
        expect(after).toBeGreaterThan(before);
    });

    test('should integrate with fraud detection', async () => {
        // 快速投币触发欺诈检测
        for (let i = 0; i < 100; i++) {
            // 插入交易记录
        }

        const score = await FraudDetectionEngine.calculateFraudScore('user3');
        expect(score.score).toBeGreaterThan(50);
    });
});
```

运行：
```bash
npm run test:integration
```

---

## 3️⃣ 端到端测试

### 完整场景：从登录到投币到封禁

```typescript
// tsrpc_server/src/server/__tests__/e2e/FullFlow.e2e.test.ts

import { HttpClient } from 'tsrpc';
import { DeviceFingerprintCollector } from '../../../assets/script/game/security/DeviceFingerprintCollector';

describe('Full Security Flow E2E', () => {
    let client: HttpClient;

    beforeAll(() => {
        client = new HttpClient(/* ... */);
    });

    test('Normal user flow', async () => {
        // 1. 收集设备指纹
        const fingerprint = await DeviceFingerprintCollector.collect();
        expect(fingerprint.canvasFingerprint).toBeDefined();

        // 2. 登录
        const loginResult = await client.callApi('Login', {
            username: 'test_user',
            password: 'password123',
            deviceFingerprint: fingerprint
        });
        expect(loginResult.isSucc).toBe(true);

        // 3. 正常投币（不触发限流）
        for (let i = 0; i < 10; i++) {
            const dropResult = await client.callApi('DropCoin', { x: 0 });
            expect(dropResult.isSucc).toBe(true);
            await new Promise(r => setTimeout(r, 1000)); // 间隔1秒
        }

        // 4. 检查欺诈评分（应该正常）
        const score = await FraudDetectionEngine.calculateFraudScore('test_user');
        expect(score.score).toBeLessThan(30);
    });

    test('Bot-like behavior should be detected and banned', async () => {
        // 1. 快速登录（机器人特征）
        const fingerprint = { /* 固定指纹 */ };
        await client.callApi('Login', { username: 'bot_user', deviceFingerprint: fingerprint });

        // 2. 高频投币（触发限流）
        for (let i = 0; i < 100; i++) {
            await client.callApi('DropCoin', { x: 0 });
            await new Promise(r => setTimeout(r, 10)); // 仅间隔10ms
        }

        // 3. 应该触发限流
        const dropResult = await client.callApi('DropCoin', { x: 0 });
        expect(dropResult.isSucc).toBe(false);
        expect(dropResult.err).toContain('Rate limit');

        // 4. 欺诈评分应该很高
        const score = await FraudDetectionEngine.calculateFraudScore('bot_user');
        expect(score.score).toBeGreaterThan(70);

        // 5. 应该被自动审核
        const moderation = await FraudDetectionEngine.autoModerate('bot_user');
        expect(moderation.action).toMatch(/restrict|ban/);
    });

    test('Multiple accounts from same device should be flagged', async () => {
        const fingerprint = await DeviceFingerprintCollector.collect();

        // 注册3个账号使用相同指纹
        const users = ['multi1', 'multi2', 'multi3'];
        for (const username of users) {
            await client.callApi('Register', { username, deviceFingerprint: fingerprint });
        }

        // 第4个账号登录应该被标记为可疑
        await client.callApi('Login', { username: 'multi4', deviceFingerprint: fingerprint });

        // 检查关联账号
        const hash = DeviceFingerprintService.generateHash(fingerprint);
        const detection = await DeviceFingerprintService.detectSuspiciousAccount(
            'multi4',
            hash,
            '127.0.0.1'
        );

        expect(detection.isSuspicious).toBe(true);
        expect(detection.relatedUsers).toHaveLength(3);
    });
});
```

运行：
```bash
npm run test:e2e
```

---

## 4️⃣ 性能测试

### 压力测试限流器

```typescript
// tsrpc_server/src/server/__tests__/performance/RateLimiter.perf.test.ts

import { performance } from 'perf_hooks';

describe('RateLimiter Performance', () => {
    test('should handle 10,000 requests in < 1 second', async () => {
        const limiter = new SlidingWindowLimiter(client, 'perf_test', 100000, 60000);

        const start = performance.now();
        const promises = [];

        for (let i = 0; i < 10000; i++) {
            promises.push(limiter.tryAcquire(`user${i % 100}`));
        }

        await Promise.all(promises);
        const duration = performance.now() - start;

        console.log(`10,000 requests took ${duration.toFixed(2)}ms`);
        expect(duration).toBeLessThan(1000); // < 1秒
    });

    test('should have low latency for single request', async () => {
        const limiter = new SlidingWindowLimiter(client, 'latency_test', 1000, 60000);

        const latencies: number[] = [];

        for (let i = 0; i < 100; i++) {
            const start = performance.now();
            await limiter.tryAcquire('user1');
            latencies.push(performance.now() - start);
        }

        const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
        const p99 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)];

        console.log(`P95 latency: ${p95.toFixed(2)}ms`);
        console.log(`P99 latency: ${p99.toFixed(2)}ms`);

        expect(p95).toBeLessThan(5); // P95 < 5ms
        expect(p99).toBeLessThan(10); // P99 < 10ms
    });
});
```

运行：
```bash
npm run test:performance
```

---

## 5️⃣ 实战演练

### 模拟真实攻击场景

创建攻击脚本：
```typescript
// tests/attack-simulation.ts

import { HttpClient } from 'tsrpc';

async function simulateBotAttack() {
    console.log('🤖 Simulating bot attack...');

    const client = new HttpClient(/* ... */);

    // 1. 快速注册大量账号
    console.log('  📝 Registering 100 accounts...');
    for (let i = 0; i < 100; i++) {
        await client.callApi('Register', {
            username: `bot_${i}`,
            password: 'password'
        });
    }

    // 2. 使用固定设备指纹登录
    const fingerprint = {
        canvasFingerprint: 'fixed_hash_123',
        webGLFingerprint: 'fixed_gl_456',
        // ...
    };

    // 3. 高频投币
    console.log('  💰 High-frequency drop coin attack...');
    const start = Date.now();
    let successCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < 1000; i++) {
        const result = await client.callApi('DropCoin', { x: 0 });
        if (result.isSucc) {
            successCount++;
        } else {
            blockedCount++;
        }
    }

    const duration = Date.now() - start;

    console.log(`\n📊 Attack Results:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  🚫 Blocked: ${blockedCount}`);
    console.log(`  ⏱️  Duration: ${duration}ms`);
    console.log(`  📈 Block Rate: ${(blockedCount / 1000 * 100).toFixed(1)}%`);
}

async function simulateMultiAccount() {
    console.log('👥 Simulating multi-account attack...');

    // 相同设备指纹注册多个账号
    const fingerprint = { /* ... */ };

    for (let i = 0; i < 10; i++) {
        await client.callApi('Register', {
            username: `multi_${i}`,
            deviceFingerprint: fingerprint
        });
    }

    // 检查是否被检测到
    const detection = await DeviceFingerprintService.detectSuspiciousAccount(
        'multi_9',
        DeviceFingerprintService.generateHash(fingerprint),
        '1.2.3.4'
    );

    console.log(`\n📊 Detection Results:`);
    console.log(`  🚨 Suspicious: ${detection.isSuspicious}`);
    console.log(`  📊 Risk Score: ${detection.riskScore}`);
    console.log(`  👥 Related Accounts: ${detection.relatedUsers.length}`);
}

// 运行模拟
(async () => {
    await simulateBotAttack();
    await simulateMultiAccount();
})();
```

运行：
```bash
npx ts-node tests/attack-simulation.ts
```

**预期输出**:
```
🤖 Simulating bot attack...
  📝 Registering 100 accounts...
  💰 High-frequency drop coin attack...

📊 Attack Results:
  ✅ Successful: 60
  🚫 Blocked: 940
  ⏱️  Duration: 2500ms
  📈 Block Rate: 94.0%

👥 Simulating multi-account attack...

📊 Detection Results:
  🚨 Suspicious: true
  📊 Risk Score: 75
  👥 Related Accounts: 9
```

---

## 🎯 监控测试结果

### 查看 Prometheus 指标

访问 http://localhost:9090，执行查询：

```promql
# 限流触发率
rate(rate_limit_hits_total[1m])

# 欺诈评分分布
histogram_quantile(0.95, fraud_score)

# 封禁用户数
increase(banned_users_total[5m])

# 投币成功率
rate(drop_coin_total{success="true"}[1m]) / rate(drop_coin_total[1m])
```

### 查看 Grafana 面板

访问 http://localhost:3001

创建面板查看：
- 限流命中趋势
- 欺诈评分分布
- 可疑登录统计
- 性能指标

---

## 📋 测试清单

运行完整测试套件：

```bash
# 1. 单元测试
npm test

# 2. 集成测试
npm run test:integration

# 3. 端到端测试
npm run test:e2e

# 4. 性能测试
npm run test:performance

# 5. 覆盖率报告
npm run test:coverage

# 6. 实战演练
npm run test:attack-simulation
```

### 测试通过标准

| 测试类型 | 通过标准 |
|---------|---------|
| 单元测试 | 覆盖率 > 90% |
| 集成测试 | 所有场景通过 |
| E2E测试 | 正常用户流畅，攻击被阻止 |
| 性能测试 | P95 < 5ms, QPS > 50000 |
| 实战演练 | 攻击阻断率 > 90% |

---

## 🐛 常见问题

### 1. DragonflyDB 连接失败

```bash
# 检查服务是否运行
docker ps | grep dragonfly

# 启动服务
docker-compose -f docker-compose.security.yml up -d dragonfly

# 测试连接
redis-cli -h localhost -p 6379 ping
```

### 2. MongoDB 连接失败

```bash
# 启动MongoDB
docker run -d -p 27017:27017 --name mongo mongo:latest

# 测试连接
mongosh --eval "db.version()"
```

### 3. 测试超时

```typescript
// jest.config.js
module.exports = {
  testTimeout: 30000, // 增加到30秒
};
```

### 4. 指标未上报

```bash
# 检查Prometheus采集
curl http://localhost:9090/api/v1/targets

# 检查指标端点
curl http://localhost:9090/metrics
```

---

## 🎓 最佳实践

### 1. 使用测试数据库

```typescript
const MONGO_URI = process.env.NODE_ENV === 'test'
    ? 'mongodb://localhost:27017/test'
    : 'mongodb://localhost:27017/production';
```

### 2. 清理测试数据

```typescript
afterEach(async () => {
    await client.flushdb();
    await db.dropDatabase();
});
```

### 3. Mock外部依赖

```typescript
jest.mock('../RustRoomClient', () => ({
    getRustRoomClient: () => ({
        playerDropCoin: jest.fn().mockReturnValue(true)
    })
}));
```

### 4. 并发测试

```typescript
test.concurrent('should handle concurrent requests', async () => {
    // 测试逻辑
});
```

---

## 📊 CI/CD 集成

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Security Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      dragonfly:
        image: docker.dragonflydb.io/dragonflydb/dragonfly
        ports:
          - 6379:6379

      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm test
      - run: npm run test:integration
      - run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

需要我继续写自动化测试脚本吗？
