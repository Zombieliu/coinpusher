# 推币机游戏项目状态文档

**项目名称**: OOPS CoinPusher (推币机游戏)
**更新日期**: 2025-12-07
**项目版本**: 3.7.0
**引擎版本**: Cocos Creator 3.8.7

---

## 📋 项目概览

### 基本信息
- **项目路径**: `/Users/henryliu/cocos/numeron-world/oops-coinpusher`
- **项目大小**: ~3.2GB
- **代码文件**: 557+ TypeScript/JavaScript 文件
- **项目类型**: 全栈推币机游戏（前端 + 后端 + 管理后台）
- **开发框架**: OOPS Framework (基于 Cocos Creator)

### 技术栈
- **前端引擎**: Cocos Creator 3.8.7
- **前端框架**: OOPS Framework (ECS架构)
- **后端框架**: TSRPC + Node.js
- **数据库**: MongoDB
- **缓存**: DragonflyDB (Redis兼容)
- **物理引擎**: Rapier3D (Rust)
- **管理后台**: Next.js 15 + React 18
- **监控**: Prometheus + Grafana + Alertmanager
- **容器化**: Docker + Docker Compose

---

## 🎮 游戏功能模块

### 1. 核心推币系统
- ✅ **物理系统** (`PhysicsSystem.ts`)
  - Rapier3D 物理引擎集成
  - 硬币碰撞检测
  - 重力和摩擦力模拟
  - 推板运动控制

- ✅ **投币系统** (`CoinPusher.ts`, `CoinPusherSystem.ts`)
  - 投币动作处理
  - 金币扣除与验证
  - 投币冷却机制
  - 投币频率限制

- ✅ **奖励系统** (`RewardSystem.ts`)
  - 掉落奖励计算
  - 每日奖励限额
  - 奖励分发机制
  - 奖励历史记录

- ✅ **中奖系统** (`JackpotSystem.ts`)
  - Jackpot 累积池
  - 中奖概率控制
  - 大奖触发机制
  - 中奖动画效果

- ✅ **特效系统** (`EffectComp.ts`)
  - 粒子特效
  - 中奖动画
  - UI 反馈效果

### 2. 游戏配置
- ✅ **配置管理** (`GameConfig.ts`)
  - 物理参数配置
  - 经济系统配置
  - 奖励规则配置
  - 游戏平衡性调整

- ✅ **状态管理** (`GameStateComp.ts`, `CoinModelComp.ts`)
  - 游戏状态追踪
  - 金币数量管理
  - 玩家数据同步

### 3. UI 系统
- ✅ **游戏主界面** (`GamePanel.ts`, `GameViewComp.ts`)
- ✅ **登录面板** (`LoginPanel.ts`)
- ✅ **设置面板** (`SettingPanel.ts`)
- ✅ **签到系统** (`CheckinPanel.ts`)
- ✅ **成就系统** (`AchievementPanel.ts`)
- ✅ **背包系统** (`InventoryPanel.ts`)
- ✅ **离线奖励** (`OfflineRewardPanel.ts`)

### 4. 扩展功能
- ✅ **区块链集成** (`blockchain/SuiManager.ts`)
  - Sui 钱包连接
  - 链上资产管理

- ✅ **Discord 集成** (`discord/DiscordManager.ts`)
  - Discord Activity 支持
  - 社交功能集成

- ✅ **安全系统** (`security/`)
  - 请求签名验证
  - 防作弊机制
  - 频率限制

---

## 🖥️ 后端服务架构

### 服务器模块

#### 1. **Gate Server** (网关服务器)
- **端口**: 2000
- **功能**:
  - 用户认证与授权
  - API 路由分发
  - WebSocket 连接管理
  - 管理后台 API

#### 2. **Match Server** (匹配服务器)
- **端口**: 3001
- **功能**:
  - 房间匹配
  - 玩家队列管理

#### 3. **Room Server** (房间服务器)
- **端口**: 3002
- **语言**: Rust
- **功能**:
  - 游戏房间逻辑
  - 物理计算 (Rapier3D)
  - 实时游戏状态同步

#### 4. **Admin Dashboard** (管理后台)
- **端口**: 3003
- **技术栈**: Next.js 15 + React 18
- **功能**:
  - 用户管理
  - 数据统计
  - 系统监控
  - 配置管理
  - 日志查看

### 数据库设计

**数据库名称**: `coinpusher_game`

**主要集合**:
- `users` - 用户信息
- `admin_users` - 管理员账号
- `admin_sessions` - 管理员会话
- `admin_logs` - 操作日志
- `reward_limits` - 奖励限额记录
- `tasks` - 任务配置
- `achievements` - 成就配置
- `items` - 道具配置
- `shop_products` - 商城商品
- `mail_templates` - 邮件模板
- `lottery_configs` - 抽奖配置
- `guilds` - 公会数据
- `friends` - 好友关系

---

## 🔐 安全与防护

### 1. 请求安全
- ✅ 请求签名验证 (`ENABLE_REQUEST_SIGNATURE`)
- ✅ 时间戳防重放 (`TIMESTAMP_TOLERANCE_SECONDS`)
- ✅ HTTPS 加密传输

### 2. 频率限制
- ✅ 投币冷却: 500ms (`DROP_COIN_COOLDOWN_MS`)
- ✅ 每分钟投币上限: 60次 (`DROP_COIN_MAX_PER_MINUTE`)
- ✅ API 请求频率限制

### 3. 经济安全
- ✅ 每日奖励上限: 1000金币 (`DAILY_REWARD_LIMIT`)
- ✅ 单次投币上限: 10金币 (`MAX_COIN_VALUE`)
- ✅ 交易幂等性保证
- ✅ 数据库事务支持

### 4. 作弊防护
- ✅ 设备指纹识别
- ✅ 欺诈行为检测
- ✅ 异常登录检测
- ✅ 自动封禁机制

---

## 📊 监控与运维

### Prometheus 监控指标

**指标前缀**: `coinpusher_`

**业务指标**:
- 投币次数统计 (`drop_coin_total`)
- 投币处理时长 (`drop_coin_duration_seconds`)
- 奖励发放统计 (`reward_given_total`)
- 每日限额命中 (`daily_limit_hits_total`)
- 频率限制统计 (`rate_limit_hits_total`)
- 欺诈评分 (`fraud_score`)
- 活跃房间数 (`active_rooms`)
- 在线用户数 (`active_users`)

**系统指标**:
- CPU 使用率
- 内存使用量
- GC 性能
- HTTP 请求延迟
- WebSocket 连接数
- 数据库操作延迟

### 告警系统
- ✅ Alertmanager 告警管理
- ✅ Grafana 可视化监控
- ✅ Node Exporter 系统监控
- ✅ MongoDB Exporter 数据库监控

---

## 🐳 Docker 部署

### 容器清单

**主服务容器**:
- `oops-coinpusher-mongodb` - MongoDB 数据库
- `oops-coinpusher-gate` - Gate 服务器
- `oops-coinpusher-match` - Match 服务器
- `oops-coinpusher-room` - Room 服务器
- `oops-coinpusher-admin` - 管理后台

**监控容器**:
- `oops-coinpusher-prometheus` - Prometheus 监控
- `oops-coinpusher-alertmanager` - 告警管理
- `oops-coinpusher-grafana` - 数据可视化
- `oops-coinpusher-node-exporter` - 系统指标导出
- `oops-coinpusher-mongodb-exporter` - MongoDB 指标导出

**网络**:
- `oops-coinpusher-network` - 服务间通信网络

---

## 📁 项目结构

```
oops-coinpusher/
├── assets/                          # 游戏资源
│   ├── resources/                   # 动态资源
│   │   ├── gui/prefab/              # UI预制体
│   │   └── prefab/model/            # 游戏模型
│   └── script/                      # 游戏脚本
│       └── game/
│           ├── coinpusher/          # 推币机核心逻辑
│           ├── blockchain/          # 区块链集成
│           ├── discord/             # Discord集成
│           ├── initialize/          # 初始化
│           ├── network/             # 网络通信
│           ├── security/            # 安全模块
│           └── utils/               # 工具函数
│
├── tsrpc_server/                    # 后端服务
│   └── src/
│       ├── server/
│       │   ├── gate/                # Gate服务器
│       │   ├── match/               # Match服务器
│       │   └── room/                # Room服务器
│       └── module/
│           ├── account/             # 账号模块
│           ├── common/              # 公共模块
│           └── config/              # 配置模块
│
├── admin-dashboard/                 # 管理后台
│   ├── app/                         # Next.js 应用
│   │   ├── dashboard/               # 仪表盘页面
│   │   └── login/                   # 登录页面
│   ├── prometheus/                  # Prometheus配置
│   └── alertmanager/                # Alertmanager配置
│
├── room-service/                    # Rust房间服务
│   ├── src/
│   │   ├── physics/                 # 物理引擎
│   │   └── network/                 # 网络通信
│   └── Cargo.toml
│
├── extensions/                      # Cocos扩展
│   ├── oops-plugin-framework/       # OOPS框架
│   └── oops-plugin-excel-to-json/   # Excel转换工具
│
├── docker-compose.yml               # 主服务容器配置
├── docker-compose.monitoring.yml    # 监控容器配置
└── package.json                     # 项目配置
```

---

## 🔧 环境配置

### 环境变量 (`.env`)

**服务端口**:
```bash
GATE_PORT=3000          # Gate服务器端口
ROOM_PORT=3001          # Room服务器端口
MATCH_PORT=3002         # Match服务器端口
```

**数据库**:
```bash
MONGODB_URI=mongodb://localhost:27017/oops_coinpusher
```

**安全配置**:
```bash
INTERNAL_SECRET_KEY=<强随机密钥>
ENABLE_REQUEST_SIGNATURE=true
TIMESTAMP_TOLERANCE_SECONDS=5
```

**经济配置**:
```bash
DAILY_REWARD_LIMIT=1000              # 每日奖励上限
MAX_COIN_VALUE=10                    # 单次投币上限
DROP_COIN_COOLDOWN_MS=500           # 投币冷却时间
DROP_COIN_MAX_PER_MINUTE=60         # 每分钟投币上限
```

---

## 🚀 快速启动

### 1. 启动数据库
```bash
docker-compose up -d mongodb
```

### 2. 创建管理员账号
```bash
cd tsrpc_server
npx ts-node create-admin-simple.ts
```

**默认管理员账号**:
- 用户名: `admin`
- 密码: `admin123`
- 角色: `super_admin`

### 3. 启动后端服务
```bash
docker-compose up -d gate-server match-server room-server
```

### 4. 启动管理后台
```bash
docker-compose up -d admin-dashboard
# 访问: http://localhost:3003
```

### 5. 启动监控系统
```bash
docker-compose -f docker-compose.monitoring.yml up -d
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3004
# Alertmanager: http://localhost:9093
```

### 6. 在 Cocos Creator 中打开项目
```bash
# 使用 Cocos Creator 3.8.7 打开
/Users/henryliu/cocos/numeron-world/oops-coinpusher
```

---

## 🧪 测试与验证

### 运行综合测试
```bash
npx ts-node comprehensive-test.ts
```

**测试覆盖**:
- ✅ 管理员登录
- ✅ 统计数据获取
- ✅ 日志分析
- ✅ 游戏区服列表
- ✅ 数据库连接
- ✅ 集合检查
- ✅ 索引验证
- ✅ 服务器端口检查

### 数据初始化
```bash
# 初始化游戏配置数据
npx ts-node initialize-game-data.ts

# 检查项目完整性
npx ts-node check-project-completeness.ts
```

---

## 📈 性能指标

### 目标性能
- **物理更新频率**: 30-60 FPS
- **网络延迟**: < 50ms
- **API 响应时间**: < 100ms (P95)
- **并发用户**: 1000+ (设计目标)

### 资源限制
- **内存使用**: < 2GB (单服务器)
- **CPU 使用**: < 50% (正常负载)
- **数据库连接**: 100 (连接池)

---

## ⚠️ 已知问题与注意事项

### 1. 安全配置
- ⚠️ 生产环境必须更改 `INTERNAL_SECRET_KEY`
- ⚠️ 管理员默认密码需要修改
- ⚠️ MongoDB 需要配置访问控制

### 2. 数据库迁移
- 🔄 项目已从 `oops-moba` 重命名为 `oops-coinpusher`
- 🔄 数据库名从 `oops_moba` 更改为 `coinpusher_game`
- 🔄 管理员密码 Salt 已更改为 `coinpusher_admin_salt`
- ⚠️ 需要重新创建管理员账号

### 3. 兼容性
- ✅ Cocos Creator 3.8.7
- ✅ Node.js 18+
- ✅ MongoDB 7.0+
- ✅ Docker 20.10+

---

## 📝 最近更新

### 2025-12-07 - 项目重命名
- ✅ 项目名称从 "OOPS-MOBA" 更改为 "OOPS CoinPusher"
- ✅ 数据库名称统一为 `coinpusher_game`
- ✅ Docker 容器名称全部更新
- ✅ 监控指标前缀更改为 `coinpusher_`
- ✅ 管理员密码 Salt 更新
- ✅ 18 个配置文件已更新

**影响文件**:
- 项目配置: 3 个
- 数据库配置: 7 个
- Docker 配置: 2 个
- 监控配置: 3 个
- 管理员系统: 3 个

---

## 📚 相关文档

- `README.md` - 项目介绍
- `DEPLOYMENT_GUIDE.md` - 部署指南
- `ADMIN_START_GUIDE.md` - 管理后台快速开始
- `TESTING_GUIDE.md` - 测试指南
- `API_HANDLERS_READY.md` - API 文档
- `DOCKER_GUIDE.md` - Docker 使用指南
- `SECURITY_IMPROVEMENTS.md` - 安全改进文档
- `OOPS_FRAMEWORK_USAGE.md` - OOPS 框架使用指南

---

## 👥 开发团队

- **框架作者**: dgflash (OOPS Framework)
- **项目负责人**: henryliu

---

## 📄 许可证

本项目使用 OOPS Framework，请遵守相关许可协议。

---

**文档版本**: 1.0
**最后更新**: 2025-12-07
**维护者**: Claude Code Assistant
