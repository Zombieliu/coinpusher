# 🔒 Security Quick Reference Card

**一分钟快速参考** - 用于快速查找和排障

---

## 🚀 快速开始

### 最小配置 (开发环境)

```bash
# 1. 复制配置
cp tsrpc_server/.env.security.example tsrpc_server/.env

# 2. 生成密钥
export SECRET=$(openssl rand -hex 64)
sed -i '' "s/REPLACE_WITH_STRONG_RANDOM_KEY_128_CHARS/$SECRET/" tsrpc_server/.env

# 3. 开发环境配置
cat >> tsrpc_server/.env << EOF
NODE_ENV=development
FORCE_HTTPS=false
ENABLE_SECURITY=false
INTEGRITY_CHECK_STRICT=false
EOF

# 4. 启动
cd tsrpc_server && npm start
```

### 生产部署 (必需配置)

```bash
# ✅ 必须配置这5项:
NODE_ENV=production
INTERNAL_SECRET_KEY=<64字节随机密钥>
AUDIT_LOG_SECRET_KEY=<64字节随机密钥>
MONGODB_PASSWORD=<强密码>
FORCE_HTTPS=true
```

---

## 🔧 常用命令

### 生成密钥

```bash
# 生成64字节密钥
openssl rand -hex 64

# 生成强密码 (20字符)
openssl rand -base64 20
```

### 管理员操作

```bash
# 创建管理员
node scripts/create-admin.js --username admin --password STRONG_PWD --role super_admin

# 启用2FA
# 登录后台 → 安全设置 → 启用双因素认证

# 重置密码
node scripts/reset-password.js --adminId xxx --password NEW_PWD
```

### 安全检查

```bash
# 验证审计日志完整性
node scripts/verify-audit-logs.js

# 查看被封禁IP
curl https://localhost:3000/api/admin/blocked-ips

# 查看活跃Session
curl https://localhost:3000/api/admin/sessions
```

---

## 🛡️ 安全功能开关

| 功能 | 环境变量 | 开发 | 生产 |
|------|---------|------|------|
| HTTPS/WSS | `FORCE_HTTPS` | false | **true** |
| 协议加密 | `ENABLE_SECURITY` | false | **true** |
| 客户端完整性 | `INTEGRITY_CHECK_STRICT` | false | true |
| 快照签名 | `ENABLE_SNAPSHOT_SIGNATURE` | false | true |
| Session IP绑定 | `ENABLE_SESSION_IP_BINDING` | false | false* |
| IP白名单 | `ENABLE_IP_WHITELIST` | false | false* |
| 错误堆栈 | `ENABLE_ERROR_STACK_TRACE` | true | **false** |

**\*可选**: 根据实际需求启用

---

## 🚨 常见问题排障

### Q1: 登录失败 "Session expired"

**原因**: Session管理器未初始化或Session过期

**解决**:
```typescript
// 检查 SessionManager 是否初始化
SessionManager.getStats()

// 延长Session时间
SESSION_LIFETIME_MS=86400000  # 24h
SESSION_IDLE_TIMEOUT_MS=7200000  # 2h
```

### Q2: "IP blocked" 无法访问

**原因**: DOS防护封禁了IP

**解决**:
```typescript
// 手动解封IP
DOSProtection.unblockIP('192.168.1.1')

// 调整限制
MAX_CONNECTIONS_PER_IP=20
IP_BLOCK_DURATION_MS=1800000  # 30分钟
```

### Q3: "CSRF token invalid"

**原因**: CSRF Token过期或Session不匹配

**解决**:
```bash
# 1. 重新获取Token
curl https://localhost:3000/api/csrf-token \
  -H "Cookie: sessionId=xxx"

# 2. 调整Token有效期
CSRF_TOKEN_LIFETIME_MS=7200000  # 2小时

# 3. 确保Cookie正确设置
# HttpOnly=true, Secure=true, SameSite=Strict
```

### Q4: "Audit log integrity failed"

**原因**: 日志链被篡改或密钥不匹配

**解决**:
```bash
# 1. 验证日志链
node scripts/verify-audit-logs.js

# 2. 检查密钥配置
echo $AUDIT_LOG_SECRET_KEY

# 3. 如果密钥丢失，日志无法恢复
# 需要重新初始化日志链
```

### Q5: MongoDB连接失败

**原因**: 认证未配置或密码错误

**解决**:
```bash
# 1. 测试连接
mongo mongodb://admin:PASSWORD@localhost:27017/admin

# 2. 检查认证状态
mongo
> use admin
> db.getUsers()

# 3. 重置密码
> db.changeUserPassword("admin", "NEW_PASSWORD")
```

---

## 📊 监控指标速查

### 关键指标

```
# 认证相关
- failed_login_attempts_total          # 失败登录次数
- account_lockouts_total                # 账号锁定次数
- totp_verification_attempts_total     # 2FA验证次数

# 会话相关
- active_sessions_count                # 活跃Session数
- session_fixation_attempts_total      # Session固定攻击
- csrf_token_failures_total            # CSRF验证失败

# 安全事件
- ip_whitelist_rejections_total        # IP白名单拒绝
- audit_log_integrity_failures_total   # 日志完整性失败
- dos_attack_detected_total            # DOS攻击检测
- dos_ip_blocked_total                 # IP封禁次数
```

### 告警阈值

```yaml
# 高优先级告警
- 失败登录 > 10次/5分钟
- DOS攻击 > 10次/1分钟
- 审计日志篡改 > 0次

# 中优先级告警
- CSRF失败 > 10次/5分钟
- Session固定攻击 > 5次/1分钟
- IP白名单拒绝 > 20次/5分钟
```

---

## 🔑 密钥管理

### 密钥类型

| 密钥 | 用途 | 长度 | 轮换周期 |
|------|------|------|---------|
| `INTERNAL_SECRET_KEY` | JWT签名、HMAC | 64字节 | 3个月 |
| `AUDIT_LOG_SECRET_KEY` | 审计日志签名 | 64字节 | 6个月 |
| `MONGODB_PASSWORD` | 数据库认证 | 20+字符 | 3个月 |
| `SSL_KEY` | TLS证书私钥 | 2048位 | 1年 |

### 密钥轮换步骤

```bash
# 1. 生成新密钥
NEW_KEY=$(openssl rand -hex 64)

# 2. 双密钥并行期 (24小时)
INTERNAL_SECRET_KEY=$OLD_KEY
INTERNAL_SECRET_KEY_NEW=$NEW_KEY

# 3. 切换到新密钥
INTERNAL_SECRET_KEY=$NEW_KEY
unset INTERNAL_SECRET_KEY_NEW

# 4. 使所有旧Session失效
curl -X POST https://localhost:3000/api/admin/invalidate-all-sessions
```

---

## 📝 日志查询

### 审计日志

```typescript
// 查询管理员操作
AuditLogger.queryLogs({
  adminId: 'admin_xxx',
  action: AuditAction.LOGIN,
  startTime: Date.now() - 86400000,  // 24h前
  limit: 100
})

// 查询失败操作
AuditLogger.queryLogs({
  success: false,
  startTime: Date.now() - 3600000,  // 1h前
})

// 验证日志完整性
AuditLogger.verifyLogChain(1, 1000)
```

### IP访问日志

```typescript
// 查询被拒绝的访问
IPWhitelist.getAccessLogs({
  allowed: false,
  startTime: Date.now() - 3600000
})

// 查询特定IP的访问
IPWhitelist.getAccessLogs({
  ip: '192.168.1.1'
})
```

---

## 🧪 测试命令

### 安全测试

```bash
# CSRF测试
curl -X POST https://localhost:3000/api/admin/config \
  -H "Cookie: sessionId=xxx" \
  -d '{"key":"value"}'
# 期望: 403 Forbidden (无CSRF Token)

# 暴力破解测试
for i in {1..6}; do
  curl -X POST https://localhost:3000/api/admin/login \
    -d '{"username":"admin","password":"wrong"}'
done
# 期望: 第6次返回 "账号已被锁定"

# DOS测试
for i in {1..11}; do
  curl https://localhost:3000 &
done
# 期望: 第11个连接被拒绝

# 审计日志完整性测试
node << EOF
const { AuditLogger } = require('./tsrpc_server/src/server/utils/AuditLogger');
AuditLogger.verifyLogChain().then(result => {
  console.log('Valid:', result.valid);
  console.log('Errors:', result.errors);
});
EOF
```

---

## 🔗 快速链接

- [完整文档](./SECURITY_COMPLETE_SUMMARY.md)
- [环境配置](./tsrpc_server/.env.security.example)
- [第一阶段修复](./SECURITY_FIXES_APPLIED.md)
- [第二+三阶段修复](./SECURITY_FIXES_PHASE2.md)
- [安全分析报告](./SECURITY_ANALYSIS_REPORT.md)

---

**版本**: 3.0
**最后更新**: 2025-12-08
**安全评分**: 9.2/10 🟢
