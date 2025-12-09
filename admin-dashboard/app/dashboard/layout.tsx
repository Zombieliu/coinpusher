'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Settings,
  Calendar,
  Mail,
  FileText,
  BarChart3,
  LogOut,
  Shield,
  FileSearch,
  Activity,
  DollarSign,
  Megaphone,
  Ticket,
  Headphones,
  Wrench,
} from 'lucide-react'
import { NotificationCenter } from '@/components/NotificationCenter'

const navigation = [
  { name: '数据看板', href: '/dashboard', icon: LayoutDashboard },
  { name: '用户管理', href: '/dashboard/users', icon: Users },
  { name: '客服工单', href: '/dashboard/support', icon: Headphones },
  { name: '财务管理', href: '/dashboard/finance', icon: DollarSign },
  { name: '游戏配置', href: '/dashboard/config', icon: Settings },
  { name: '活动管理', href: '/dashboard/events', icon: Calendar },
  { name: '公告管理', href: '/dashboard/announcements', icon: Megaphone },
  { name: 'CDK管理', href: '/dashboard/cdk', icon: Ticket },
  { name: '系统维护', href: '/dashboard/maintenance', icon: Wrench },
  { name: '管理员', href: '/dashboard/admins', icon: Shield },
  { name: '邮件系统', href: '/dashboard/mails', icon: Mail },
  { name: '日志查询', href: '/dashboard/logs', icon: FileText },
  { name: '审计分析', href: '/dashboard/analytics', icon: BarChart3 },
  { name: '审计日志', href: '/dashboard/audit', icon: FileSearch },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('admin_token')
    const userStr = localStorage.getItem('admin_user')

    if (!token) {
      router.push('/login')
      return
    }

    if (userStr && userStr !== 'undefined') {
      try {
        setAdminUser(JSON.parse(userStr))
      } catch (error) {
        console.error('Failed to parse admin user:', error)
        localStorage.removeItem('admin_user')
      }
    }

    setLoading(false)
  }, [router])

  function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b">
          <h1 className="text-xl font-bold text-blue-600">Oops MOBA 后台</h1>
        </div>
        <nav className="mt-6 px-3">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            退出登录
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="ml-64">
        {/* 顶部栏 */}
        <div className="flex h-16 items-center justify-between border-b bg-white px-8">
          <h2 className="text-lg font-semibold">
            {navigation.find((item) => item.href === pathname)?.name || '运营后台'}
          </h2>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {adminUser?.username || '管理员'}
              </div>
              <div className="text-xs text-gray-500">
                {adminUser?.role || 'admin'}
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
              {adminUser?.username?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </div>

        {/* 页面内容 */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
