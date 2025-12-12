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
  HeartPulse,
} from 'lucide-react'
import { NotificationCenter } from '@/components/NotificationCenter'
import { useTranslation } from '@/components/providers/i18n-provider'
import { LanguageSwitcher } from '@/components/language-switcher'

const navigation = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'users', href: '/dashboard/users', icon: Users },
  { key: 'support', href: '/dashboard/support', icon: Headphones },
  { key: 'finance', href: '/dashboard/finance', icon: DollarSign },
  { key: 'config', href: '/dashboard/config', icon: Settings },
  { key: 'events', href: '/dashboard/events', icon: Calendar },
  { key: 'announcements', href: '/dashboard/announcements', icon: Megaphone },
  { key: 'invite', href: '/dashboard/invite', icon: Activity },
  { key: 'cdk', href: '/dashboard/cdk', icon: Ticket },
  { key: 'maintenance', href: '/dashboard/maintenance', icon: Wrench },
  { key: 'admins', href: '/dashboard/admins', icon: Shield },
  { key: 'mails', href: '/dashboard/mails', icon: Mail },
  { key: 'logs', href: '/dashboard/logs', icon: FileText },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { key: 'audit', href: '/dashboard/audit', icon: FileSearch },
  { key: 'health', href: '/dashboard/health', icon: HeartPulse },
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
  const { t: tLayout } = useTranslation('layout')
  const { t: tNav } = useTranslation('nav')
  const { t: tCommon } = useTranslation('common')

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('admin_token')
    const userStr = localStorage.getItem('admin_user')

    if (!token) {
      router.push('/login')
      return
    }
    document.cookie = `admin_token=${token}; path=/; max-age=86400; SameSite=Lax`

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
    if (confirm(tLayout('logoutConfirm'))) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      document.cookie = 'admin_token=; path=/; max-age=0; SameSite=Lax'
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{tLayout('loading')}</p>
        </div>
      </div>
    )
  }

  const activeNav = navigation.find((item) => item.href === pathname)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b">
          <h1 className="text-xl font-bold text-blue-600">{tCommon('appName')}</h1>
        </div>
        <nav className="mt-6 px-3">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5" />
                {tNav(item.key)}
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
            {tLayout('logout')}
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="ml-64">
        {/* 顶部栏 */}
        <div className="flex h-16 items-center justify-between border-b bg-white px-8">
          <h2 className="text-lg font-semibold">
            {activeNav ? tNav(activeNav.key) : tLayout('titleFallback')}
          </h2>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <NotificationCenter />
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {adminUser?.username || tLayout('defaultRole')}
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
