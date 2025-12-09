/**
 * API客户端 - 对接TSRPC后端
 */

// 直接访问后端API
// 在浏览器中运行时使用 localhost:32000（宿主机端口，映射到gate-server:3000）
const API_BASE = typeof window !== 'undefined'
  ? 'https://localhost:32000'  // 浏览器端
  : (process.env.NEXT_PUBLIC_API_URL || 'https://gate-server:3000') // 服务器端

// 忽略自签名证书错误（开发环境）
if (typeof window === 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export interface ApiResponse<T = any> {
  isSucc: boolean
  res?: T
  err?: {
    message: string
    type: string
  }
}

/**
 * 调用TSRPC API
 */
export async function callAPI<T = any>(
  method: string,
  data: any = {}
): Promise<ApiResponse<T>> {
  try {
    // 将token添加到请求体中作为__ssoToken
    const requestData = {
      ...data,
      __ssoToken: getAdminToken(),
    }

    const response = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const res = await response.json()

    // 统一处理Token过期
    if (!res.isSucc && res.err?.message === 'Invalid or expired token') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        window.location.href = '/login'
      }
    }

    return res
  } catch (error: any) {
    console.error(`API调用失败 [${method}]:`, error)
    return {
      isSucc: false,
      err: {
        message: error.message || '网络错误',
        type: 'NetworkError',
      },
    }
  }
}

function getAdminToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_token') || ''
  }
  return ''
}

// ==================== 管理员API ====================

/**
 * 获取用户列表
 */
export async function fetchUsers(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
}) {
  return callAPI('admin/GetUsers', params)
}

/**
 * 获取用户详情
 */
export async function fetchUserDetail(userId: string) {
  return callAPI('admin/GetUserDetail', { userId })
}

/**
 * 封禁用户
 */
export async function banUser(userId: string, reason: string, duration: number) {
  return callAPI('admin/BanUser', { userId, reason, duration })
}

/**
 * 解封用户
 */
export async function unbanUser(userId: string) {
  return callAPI('admin/UnbanUser', { userId })
}

/**
 * 发放奖励
 */
export async function grantReward(userId: string, rewards: any) {
  return callAPI('admin/GrantReward', { userId, rewards })
}

/**
 * 获取统计数据
 */
export async function fetchStatistics() {
  return callAPI('admin/GetStatistics', {})
}

/**
 * 发送邮件
 */
export async function sendMail(params: {
  type: 'single' | 'batch' | 'broadcast'
  userIds?: string[]
  title: string
  content: string
  rewards?: any
  expireAt?: number
}) {
  return callAPI('admin/SendMail', params)
}

/**
 * 获取活动列表
 */
export async function fetchEvents() {
  return callAPI('admin/GetEvents', {})
}

/**
 * 创建活动
 */
export async function createEvent(event: any) {
  return callAPI('admin/CreateEvent', event)
}

/**
 * 更新活动
 */
export async function updateEvent(eventId: string, event: any) {
  return callAPI('admin/UpdateEvent', { eventId, ...event })
}

/**
 * 删除活动
 */
export async function deleteEvent(eventId: string) {
  return callAPI('admin/DeleteEvent', { eventId })
}

/**
 * 获取配置
 */
export async function fetchConfig(configType: string) {
  return callAPI('admin/GetConfig', { configType })
}

/**
 * 更新配置
 */
export async function updateConfig(configType: string, config: any, comment?: string) {
  return callAPI('admin/UpdateConfig', { configType, config, comment })
}

/**
 * 获取配置历史
 */
export async function fetchConfigHistory(configType: string, page = 1, limit = 10) {
  return callAPI('admin/GetConfigHistory', { configType, page, limit })
}

/**
 * 回滚配置
 */
export async function rollbackConfig(configType: string, historyId: string) {
  return callAPI('admin/RollbackConfig', { configType, historyId })
}

/**
 * 获取日志
 */
export async function fetchLogs(params: {
  type: string
  startTime?: number
  endTime?: number
  userId?: string
  page?: number
  limit?: number
}) {
  return callAPI('admin/GetLogs', params)
}

/**
 * 获取日志分析数据
 */
export async function fetchLogAnalytics(params: {
  startTime?: number
  endTime?: number
}) {
  return callAPI('admin/GetLogAnalytics', params)
}

// ==================== 管理员管理API ====================

/**
 * 获取管理员列表
 */
export async function fetchAdmins() {
  return callAPI('admin/GetAdmins', {})
}

/**
 * 创建管理员
 */
export async function createAdmin(params: {
  username: string
  password: string
  role: 'super_admin' | 'operator' | 'customer_service' | 'analyst'
  email?: string
}) {
  return callAPI('admin/CreateAdmin', params)
}

/**
 * 更新管理员状态
 */
export async function updateAdminStatus(adminId: string, status: 'active' | 'disabled') {
  return callAPI('admin/UpdateAdminStatus', { adminId, status })
}

// ==================== 审计日志API ====================

/**
 * 获取审计日志
 */
export async function fetchAuditLogs(params: {
  adminId?: string
  action?: string
  category?: 'user_management' | 'admin_management' | 'system_config' | 'game_data' | 'financial' | 'security'
  targetId?: string
  startTime?: number
  endTime?: number
  result?: 'success' | 'failed'
  page?: number
  limit?: number
}) {
  return callAPI('admin/GetAuditLogs', params)
}

/**
 * 获取审计统计
 */
export async function fetchAuditStatistics(params: {
  startTime?: number
  endTime?: number
}) {
  return callAPI('admin/GetAuditStatistics', params)
}

// ==================== 监控系统API ====================

/**
 * 获取系统指标
 */
export async function fetchSystemMetrics(params: {}) {
  return callAPI('admin/GetSystemMetrics', params)
}

/**
 * 获取活动告警
 */
export async function fetchActiveAlerts(params: {}) {
  return callAPI('admin/GetActiveAlerts', params)
}

// ==================== 财务系统API ====================

/**
 * 获取订单列表
 */
export async function fetchOrders(params: {
  userId?: string
  status?: string
  orderId?: string
  startDate?: number
  endDate?: number
  page?: number
  limit?: number
}) {
  return callAPI('admin/GetOrders', params)
}

/**
 * 获取财务统计
 */
export async function fetchFinancialStats(params: {
  startDate: number
  endDate: number
}) {
  return callAPI('admin/GetFinancialStats', params)
}

/**
 * 获取退款申请
 */
export async function fetchRefunds(params: {
  status?: string
  page?: number
  limit?: number
}) {
  return callAPI('admin/GetRefunds', params)
}

/**
 * 处理退款
 */
export async function processRefund(params: {
  refundId: string
  approved: boolean
}) {
  return callAPI('admin/ProcessRefund', params)
}

// ==================== 公告管理API ====================

/**
 * 获取公告列表
 */
export async function fetchAnnouncements(params: {
  type?: string
  activeOnly?: boolean
  page?: number
  limit?: number
}) {
  return callAPI('admin/GetAnnouncements', params)
}

/**
 * 创建公告
 */
export async function createAnnouncement(params: {
  type: string
  title: string
  content: string
  startTime: number
  endTime: number
  priority?: number
  platforms?: string[]
  imageUrl?: string
  linkUrl?: string
}) {
  return callAPI('admin/CreateAnnouncement', params)
}

/**
 * 更新公告
 */
export async function updateAnnouncement(announcementId: string, updates: any) {
  return callAPI('admin/UpdateAnnouncement', { announcementId, updates })
}

/**
 * 删除公告
 */
export async function deleteAnnouncement(announcementId: string) {
  return callAPI('admin/DeleteAnnouncement', { announcementId })
}

// ==================== CDK管理API ====================

/**
 * 获取CDK列表
 */
export async function fetchCdkList(params: {
  batchId?: string
  code?: string
  type?: string
  active?: boolean
  page?: number
  limit?: number
}) {
  return callAPI('admin/GetCdkList', params)
}

/**
 * 生成CDK
 */
export async function generateCdk(params: {
  name: string
  type: string
  rewards: any
  count: number
  usageLimit: number
  prefix?: string
  expireAt: number
}) {
  return callAPI('admin/GenerateCdk', params)
}

/**
 * 禁用CDK
 */
export async function disableCdk(params: {
  code: string
  disableBatch?: boolean
}) {
  return callAPI('admin/DisableCdk', params)
}

// ==================== 系统维护 ====================

export async function fetchSystemConfig(key: string) {
  return callAPI('admin/GetSystemConfig', { key })
}

export async function setMaintenance(params: {
  enabled: boolean
  reason?: string
  whitelistIps?: string[]
  whitelistUsers?: string[]
}) {
  return callAPI('admin/SetMaintenance', params)
}

// ==================== 客服工单 ====================

export async function fetchTickets(params: {
  userId?: string
  status?: string
  page?: number
  limit?: number
}) {
  return callAPI('admin/GetTickets', params)
}

export async function replyTicket(params: {
  ticketId: string
  content: string
  closeTicket?: boolean
}) {
  return callAPI('admin/ReplyTicket', params)
}

// ==================== 高级分析 ====================

export async function fetchAdvancedStats(params: {
  type: 'ltv' | 'retention'
  days?: number
}) {
  return callAPI('admin/GetAdvancedStats', params)
}

// ==================== 实时日志 ====================

export async function fetchLiveLogs(params: {
  lines?: number
  grep?: string
}) {
  return callAPI('admin/GetLiveLogs', params)
}
