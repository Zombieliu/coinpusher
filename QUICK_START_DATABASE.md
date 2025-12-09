# 🚀 快速启动指南 - 数据库配置

## 一键启动所有服务

### 1. 启动数据库服务

```bash
# 启动MongoDB
docker run -d \
  --name oops-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  -v oops_mongodb_data:/data/db \
  mongo:7.0

# 启动DragonflyDB
docker run -d \
  --name oops-dragonfly \
  -p 6379:6379 \
  --ulimit memlock=-1 \
  docker.dragonflydb.io/dragonflydb/dragonfly

# 验证服务状态
docker ps | grep oops
```

### 2. 配置环境变量

创建 `tsrpc_server/.env` 文件：

```env
# MongoDB配置
MONGODB_URI=mongodb://admin:admin123@localhost:27017/oops_moba?authSource=admin
DB_NAME=oops_moba

# DragonflyDB配置
DRAGONFLY_URL=redis://localhost:6379

# 服务器配置
NODE_ENV=development
PORT=3000
```

### 3. 初始化数据库

```bash
cd tsrpc_server

# 安装依赖
npm install mongodb redis

# 启动服务器（会自动创建索引）
npm run dev
```

### 4. 验证连接

```bash
# 验证MongoDB连接
docker exec -it oops-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin

# 验证DragonflyDB连接
docker exec -it oops-dragonfly redis-cli ping
# 应返回: PONG
```

---

## 服务器集成代码

### 在Gate服务器启动时初始化

**文件**: `tsrpc_server/src/server/gate/GateServer.ts`

```typescript
import { MongoDBService } from './db/MongoDBService';
import { DragonflyDBService } from './db/DragonflyDBService';

export class GateServer {
    async start() {
        console.log('[GateServer] Starting...');

        // 1. 连接MongoDB
        await MongoDBService.connect(
            process.env.MONGODB_URI || 'mongodb://localhost:27017',
            process.env.DB_NAME || 'oops_moba'
        );

        // 2. 连接DragonflyDB
        await DragonflyDBService.connect(
            process.env.DRAGONFLY_URL || 'redis://localhost:6379'
        );

        // 3. 启动TSRPC服务器
        await this.startTsrpcServer();

        console.log('[GateServer] ✅ All services started');
    }

    async stop() {
        console.log('[GateServer] Stopping...');

        // 断开数据库连接
        await MongoDBService.disconnect();
        await DragonflyDBService.disconnect();

        console.log('[GateServer] ✅ Stopped');
    }
}
```

---

## 测试数据库连接

创建测试脚本 `test-database.ts`:

```typescript
import { MongoDBService } from './tsrpc_server/src/server/gate/db/MongoDBService';
import { DragonflyDBService } from './tsrpc_server/src/server/gate/db/DragonflyDBService';

async function testDatabases() {
    try {
        // 测试MongoDB
        console.log('Testing MongoDB...');
        await MongoDBService.connect(
            'mongodb://admin:admin123@localhost:27017/oops_moba?authSource=admin',
            'oops_moba'
        );
        const healthy = await MongoDBService.healthCheck();
        console.log('MongoDB health:', healthy ? '✅' : '❌');

        // 测试DragonflyDB
        console.log('\nTesting DragonflyDB...');
        await DragonflyDBService.connect('redis://localhost:6379');
        const pong = await DragonflyDBService.ping();
        console.log('DragonflyDB ping:', pong ? '✅' : '❌');

        // 测试写入
        await DragonflyDBService.set('test:key', 'Hello World!', 10);
        const value = await DragonflyDBService.get('test:key');
        console.log('DragonflyDB read:', value === 'Hello World!' ? '✅' : '❌');

        // 测试排行榜
        await DragonflyDBService.updateLeaderboardScore('test:leaderboard', 'user1', 100);
        await DragonflyDBService.updateLeaderboardScore('test:leaderboard', 'user2', 200);
        const leaderboard = await DragonflyDBService.getLeaderboard('test:leaderboard', 0, 10);
        console.log('Leaderboard:', leaderboard);

        console.log('\n✅ All tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await MongoDBService.disconnect();
        await DragonflyDBService.disconnect();
    }
}

testDatabases();
```

运行测试：

```bash
npx tsx test-database.ts
```

---

## Docker Compose方式（推荐）

创建 `docker-compose.db.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: oops-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  dragonfly:
    image: docker.dragonflydb.io/dragonflydb/dragonfly
    container_name: oops-dragonfly
    ports:
      - "6379:6379"
    ulimits:
      memlock: -1
    restart: unless-stopped

volumes:
  mongodb_data:
```

启动：

```bash
docker-compose -f docker-compose.db.yml up -d
```

停止：

```bash
docker-compose -f docker-compose.db.yml down
```

---

## 数据迁移

### 从内存迁移到MongoDB

```typescript
import { TaskSystem } from './tsrpc_server/src/server/gate/bll/TaskSystem';
import { MongoDBService } from './tsrpc_server/src/server/gate/db/MongoDBService';

async function migrateTaskData() {
    // 连接数据库
    await MongoDBService.connect('mongodb://localhost:27017', 'oops_moba');

    // 获取所有用户的内存任务数据
    const userIds = ['user1', 'user2', 'user3']; // 从某处获取所有用户ID

    for (const userId of userIds) {
        // 获取内存中的任务数据
        const dailyTasks = await TaskSystem.getUserTasks(userId, 'daily');
        const weeklyTasks = await TaskSystem.getUserTasks(userId, 'weekly');

        // 保存到MongoDB
        const collection = MongoDBService.getCollection('user_tasks');

        for (const task of [...dailyTasks, ...weeklyTasks]) {
            await collection.updateOne(
                { userId, taskId: task.taskId },
                { $set: { ...task, updatedAt: Date.now() } },
                { upsert: true }
            );
        }

        console.log(`✅ Migrated tasks for ${userId}`);
    }

    console.log('Migration completed!');
}
```

### 迁移排行榜到DragonflyDB

```typescript
import { LeaderboardSystem } from './tsrpc_server/src/server/gate/bll/LeaderboardSystem';
import { LeaderboardSystemV2 } from './tsrpc_server/src/server/gate/bll/LeaderboardSystemV2';
import { DragonflyDBService } from './tsrpc_server/src/server/gate/db/DragonflyDBService';

async function migrateLeaderboardData() {
    await DragonflyDBService.connect('redis://localhost:6379');

    // 迁移日榜
    const dailyLeaderboard = await LeaderboardSystem.getLeaderboard('daily', 'total_reward', 10000);

    await LeaderboardSystemV2.batchUpdateLeaderboard(
        'daily',
        'total_reward',
        dailyLeaderboard.map(entry => ({
            userId: entry.userId,
            username: entry.username,
            score: entry.score
        }))
    );

    console.log('✅ Leaderboard migration completed!');
}
```

---

## 监控脚本

创建 `monitor-database.ts`:

```typescript
import { MongoDBService } from './tsrpc_server/src/server/gate/db/MongoDBService';
import { DragonflyDBService } from './tsrpc_server/src/server/gate/db/DragonflyDBService';

async function monitorDatabases() {
    await MongoDBService.connect('mongodb://localhost:27017', 'oops_moba');
    await DragonflyDBService.connect('redis://localhost:6379');

    setInterval(async () => {
        console.clear();
        console.log('='.repeat(50));
        console.log('Database Status Monitor');
        console.log('='.repeat(50));

        // MongoDB状态
        const mongoHealthy = await MongoDBService.healthCheck();
        console.log(`\nMongoDB: ${mongoHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

        const collections = ['users', 'user_tasks', 'user_achievements', 'guilds'];
        for (const name of collections) {
            const stats = await MongoDBService.getCollectionStats(name);
            console.log(`  ${name}: ${stats.count} documents, ${(stats.size / 1024).toFixed(2)} KB`);
        }

        // DragonflyDB状态
        const dragonflyHealthy = await DragonflyDBService.ping();
        console.log(`\nDragonflyDB: ${dragonflyHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

        const info = await DragonflyDBService.info('stats');
        console.log(`  ${info.split('\n').slice(0, 5).join('\n  ')}`);

        console.log('\n' + '='.repeat(50));
    }, 5000);
}

monitorDatabases();
```

---

## 常见问题

### Q1: MongoDB连接失败

```bash
# 检查MongoDB是否运行
docker ps | grep mongodb

# 查看日志
docker logs oops-mongodb

# 重启MongoDB
docker restart oops-mongodb
```

### Q2: DragonflyDB内存不足

```bash
# 设置最大内存限制
docker run -d \
  --name oops-dragonfly \
  -p 6379:6379 \
  --memory="2g" \
  docker.dragonflydb.io/dragonflydb/dragonfly \
  --maxmemory 2gb
```

### Q3: 索引创建失败

```typescript
// 手动创建索引
const collection = MongoDBService.getCollection('users');
await collection.createIndex({ userId: 1 }, { unique: true });
```

---

## 性能优化建议

### MongoDB优化

1. **连接池配置**
```typescript
await MongoDBService.connect(uri, dbName, {
    maxPoolSize: 100,  // 生产环境建议100
    minPoolSize: 20,   // 最少保持20个连接
});
```

2. **批量操作**
```typescript
const bulk = collection.initializeUnorderedBulkOp();
bulk.insert({ userId: 'user1', ... });
bulk.insert({ userId: 'user2', ... });
await bulk.execute();
```

### DragonflyDB优化

1. **Pipeline批量操作**
```typescript
const pipeline = DragonflyDBService.getClient().multi();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
await pipeline.exec();
```

2. **使用连接池**
```typescript
// 已内置在DragonflyDBService中
```

---

## 备份与恢复

### MongoDB备份

```bash
# 备份
docker exec oops-mongodb mongodump \
  --username admin \
  --password admin123 \
  --authenticationDatabase admin \
  --db oops_moba \
  --out /backup

# 恢复
docker exec oops-mongodb mongorestore \
  --username admin \
  --password admin123 \
  --authenticationDatabase admin \
  --db oops_moba \
  /backup/oops_moba
```

### DragonflyDB备份

```bash
# 使用RDB快照
docker exec oops-dragonfly redis-cli SAVE

# 或使用AOF持久化
docker run -d \
  --name oops-dragonfly \
  -p 6379:6379 \
  -v dragonfly_data:/data \
  docker.dragonflydb.io/dragonflydb/dragonfly \
  --dir /data \
  --appendonly yes
```

---

✅ **完成！现在可以开始使用完整的数据库和API系统了！**
