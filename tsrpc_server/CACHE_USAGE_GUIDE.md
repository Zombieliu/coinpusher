# 🗄️ 缓存使用指南

## 概述

本项目使用双层缓存架构：
- **一级缓存**：内存缓存（LRU，最大 1000 项）
- **二级缓存**：DragonflyDB/Redis（分布式缓存）

缓存管理器 `CacheManager` 提供了统一的缓存接口，自动处理缓存穿透、缓存击穿等问题。

---

## 快速开始

### 1. 基本用法

```typescript
import { CacheManager } from './utils/CacheManager';

// 设置缓存
await CacheManager.set('user:123', userData, {
    ttl: 300,  // 5分钟
    prefix: 'api'
});

// 获取缓存
const user = await CacheManager.get('user:123', {
    prefix: 'api'
});

// 删除缓存
await CacheManager.del('user:123', {
    prefix: 'api'
});
```

### 2. 使用 getOrSet（推荐）

`getOrSet` 是最常用的模式，自动处理缓存未命中的情况：

```typescript
import { getOrSet } from './utils/CacheManager';

const products = await getOrSet(
    'shop:products:all',
    async () => {
        // 缓存未命中时执行
        return await ShopSystem.getAvailableProducts();
    },
    {
        ttl: 300,      // 5分钟
        prefix: 'api',
    }
);
```

### 3. 在 API 中使用

```typescript
import { apiWrapper, validateRequired } from '../../utils/ErrorHandler';
import { Logger } from '../../utils/Logger';
import { getOrSet } from '../../utils/CacheManager';

export const ApiGetShopProducts = apiWrapper<ReqGetShopProducts, ResGetShopProducts>(
    async (call) => {
        validateRequired(call.req.userId, 'userId');

        // 使用缓存
        const products = await getOrSet(
            `shop:products:${call.req.category || 'all'}`,
            async () => await ShopSystem.getAvailableProducts(call.req.userId),
            { ttl: 300, prefix: 'api' }
        );

        Logger.info('Shop products retrieved', {
            userId: call.req.userId,
            productCount: products.length,
        });

        return { products };
    }
);
```

---

## 缓存策略

### 根据数据特性选择 TTL

| 数据类型 | 建议 TTL | 原因 |
|----------|---------|------|
| 用户基本信息 | 60-300秒 | 更新不频繁，但需要相对实时 |
| 商品列表 | 300-600秒 | 更新频率低，可以缓存较长时间 |
| 签到信息 | 30-60秒 | 需要相对实时，但访问频繁 |
| 排行榜 | 60-300秒 | 可以接受一定延迟，访问频繁 |
| VIP信息 | 300-600秒 | 更新频率非常低 |
| 配置数据 | 600-3600秒 | 几乎不变，可长期缓存 |

### 缓存 Key 命名规范

```
格式: {prefix}:{module}:{entity}:{identifier}
示例:
  - api:shop:products:all
  - api:shop:products:currency
  - api:user:info:123456
  - api:signin:info:123456
  - api:leaderboard:gold:top100
```

---

## 缓存配置选项

```typescript
interface CacheOptions {
    /** 缓存时间（秒），默认 300 秒 */
    ttl?: number;

    /** 是否使用内存缓存，默认 true */
    useMemoryCache?: boolean;

    /** 是否使用 Redis 缓存，默认 true */
    useRedisCache?: boolean;

    /** 缓存key前缀 */
    prefix?: string;

    /** 是否启用缓存穿透保护（缓存空值），默认 true */
    cacheNull?: boolean;

    /** 空值缓存时间（秒），默认 60 秒 */
    nullTtl?: number;
}
```

### 示例配置

```typescript
// 仅使用内存缓存（快速访问）
await CacheManager.set('temp:data', value, {
    ttl: 60,
    useMemoryCache: true,
    useRedisCache: false,
});

// 仅使用 Redis（分布式环境）
await CacheManager.set('global:config', config, {
    ttl: 3600,
    useMemoryCache: false,
    useRedisCache: true,
});

// 禁用空值缓存（避免缓存穿透）
await getOrSet(
    'user:profile:123',
    async () => await getUserProfile('123'),
    {
        ttl: 300,
        cacheNull: false,  // 不缓存 null 值
    }
);
```

---

## 高级功能

### 1. 缓存预热

在服务启动时预加载热点数据：

```typescript
import { warmupCache } from './utils/CacheManager';

// 启动时预热商品数据
async function warmupShopProducts() {
    const categories = ['currency', 'item', 'buff'];
    await warmupCache(
        categories,
        async (category) => {
            return await ShopSystem.getProductsByCategory(category);
        },
        {
            ttl: 600,
            prefix: 'api:shop:products',
        }
    );
}
```

### 2. 缓存失效

当数据更新时，需要主动删除缓存：

```typescript
// 更新商品后删除缓存
export const ApiUpdateProduct = apiWrapper(async (call) => {
    // 更新数据库
    await ShopSystem.updateProduct(call.req.productId, call.req.data);

    // 删除缓存
    await CacheManager.del('shop:products:all', { prefix: 'api' });
    await CacheManager.del(`shop:products:${product.category}`, { prefix: 'api' });

    return { success: true };
});
```

### 3. 使用装饰器（实验性）

```typescript
import { Cacheable, CacheEvict } from './utils/CacheManager';

class UserService {
    // 自动缓存
    @Cacheable('user', { ttl: 300 })
    static async getUserById(userId: string) {
        return await UserDB.getUserById(userId);
    }

    // 自动失效缓存
    @CacheEvict('user')
    static async updateUser(userId: string, data: any) {
        return await UserDB.updateUser(userId, data);
    }
}
```

### 4. 查看缓存统计

```typescript
// 获取缓存统计信息
const stats = CacheManager.getStats();
console.log(stats);

/*
输出：
{
  memory: {
    size: 234,
    maxSize: 1000,
    hits: 1523,
    misses: 432,
    hitRate: '0.78'
  },
  redis: {
    hits: 3421,
    misses: 876,
    hitRate: '0.80'
  },
  operations: {
    sets: 1234,
    deletes: 56
  }
}
*/

// 重置统计
CacheManager.resetStats();

// 清空所有内存缓存
CacheManager.clearAll();
```

---

## 最佳实践

### ✅ 推荐做法

1. **使用 getOrSet** - 简化代码，自动处理缓存未命中
2. **合理设置 TTL** - 根据数据更新频率和实时性要求
3. **缓存热点数据** - 高频访问且变化不频繁的数据
4. **主动失效缓存** - 数据更新时立即删除相关缓存
5. **使用统一前缀** - 便于管理和批量删除
6. **启用空值缓存** - 防止缓存穿透攻击

### ❌ 避免做法

1. **不要缓存实时性要求极高的数据** - 如库存、余额
2. **不要缓存敏感信息** - 如密码、token
3. **不要设置过长的 TTL** - 可能导致数据不一致
4. **不要在事务中使用缓存** - 可能导致数据不一致
5. **不要过度缓存** - 内存有限，优先缓存热点数据

---

## 缓存问题处理

### 缓存穿透（查询不存在的数据）

**问题**：大量请求查询不存在的数据，绕过缓存直击数据库

**解决方案**：启用空值缓存（默认已启用）

```typescript
await getOrSet(
    'user:123',
    async () => {
        const user = await UserDB.getUserById('123');
        return user;  // 即使是 null 也会被缓存
    },
    {
        ttl: 300,
        cacheNull: true,    // 缓存 null 值
        nullTtl: 60,        // null 值缓存时间更短
    }
);
```

### 缓存击穿（热点数据过期）

**问题**：热点数据过期瞬间，大量请求同时访问数据库

**解决方案**：使用分布式锁（已在 DragonflyDBService 中实现）

```typescript
import { DragonflyDBService } from './db/DragonflyDBService';

const lockKey = `lock:update:${userId}`;
const result = await DragonflyDBService.withLock(
    lockKey,
    async () => {
        // 只有获取锁的请求才会执行
        return await expensiveOperation();
    },
    10  // 锁超时时间（秒）
);
```

### 缓存雪崩（大量缓存同时过期）

**问题**：大量缓存同时过期，导致数据库压力激增

**解决方案**：为 TTL 添加随机值

```typescript
const baseTtl = 300;
const randomOffset = Math.floor(Math.random() * 60);  // 0-60秒随机偏移
await CacheManager.set('key', value, {
    ttl: baseTtl + randomOffset,  // 300-360秒
});
```

---

## 性能监控

### 启动清理任务

```typescript
import { CacheManager } from './utils/CacheManager';

// 每分钟清理一次过期的内存缓存
CacheManager.startCleanupTask(60000);
```

### 定期检查缓存命中率

```typescript
setInterval(() => {
    const stats = CacheManager.getStats();
    const memoryHitRate = parseFloat(stats.memory.hitRate);
    const redisHitRate = parseFloat(stats.redis.hitRate);

    if (memoryHitRate < 0.7) {
        Logger.warn('Low memory cache hit rate', { hitRate: memoryHitRate });
    }

    if (redisHitRate < 0.6) {
        Logger.warn('Low Redis cache hit rate', { hitRate: redisHitRate });
    }
}, 300000);  // 每5分钟检查一次
```

---

## 示例：完整的 API 实现

```typescript
import { ApiCall } from 'tsrpc';
import { apiWrapper, validateRequired } from '../../utils/ErrorHandler';
import { Logger } from '../../utils/Logger';
import { getOrSet, CacheManager } from '../../utils/CacheManager';

/**
 * 获取用户VIP信息
 */
export const ApiGetVIPInfo = apiWrapper<ReqGetVIPInfo, ResGetVIPInfo>(
    async (call) => {
        // 1. 参数验证
        validateRequired(call.req.userId, 'userId');

        const { userId } = call.req;

        // 2. 使用缓存（5分钟）
        const vipInfo = await getOrSet(
            `vip:info:${userId}`,
            async () => {
                Logger.debug('Fetching VIP info from database', { userId });

                // 实际的数据库查询
                const info = await VIPSystem.getVIPInfo(userId);

                // 可以在这里做额外的处理
                return info;
            },
            {
                ttl: 300,       // 5分钟
                prefix: 'api',
                cacheNull: true, // 缓存空值防止穿透
            }
        );

        // 3. 日志记录
        Logger.info('VIP info retrieved', {
            userId,
            vipLevel: vipInfo?.vipLevel || 0,
            cached: true,
        });

        // 4. 返回结果
        return vipInfo;
    }
);

/**
 * 更新用户VIP（需要删除缓存）
 */
export const ApiUpdateVIP = apiWrapper<ReqUpdateVIP, ResUpdateVIP>(
    async (call) => {
        validateRequired(call.req.userId, 'userId');

        const { userId, vipLevel } = call.req;

        // 1. 更新数据库
        await VIPSystem.updateVIPLevel(userId, vipLevel);

        // 2. 删除缓存
        await CacheManager.del(`vip:info:${userId}`, { prefix: 'api' });

        // 3. 日志记录
        Logger.info('VIP updated and cache invalidated', { userId, vipLevel });

        return { success: true };
    }
);
```

---

## 总结

- ✅ 使用 `getOrSet` 简化缓存逻辑
- ✅ 根据数据特性设置合理的 TTL
- ✅ 数据更新时主动删除缓存
- ✅ 启用空值缓存防止穿透
- ✅ 定期监控缓存命中率
- ✅ 使用统一的缓存 key 命名规范

通过合理使用缓存，可以显著提升 API 响应速度，减少数据库压力，提升用户体验！ 🚀
