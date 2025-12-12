'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Info, Mail, Settings, Calendar, Gift } from 'lucide-react'
import { useTranslation } from '@/components/providers/i18n-provider'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  timestamp: number
  adminName?: string
  read?: boolean
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const { t, locale } = useTranslation('notifications')
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      console.warn('EventSource is not supported by this browser.')
      return
    }

    let source: EventSource | null = null
    let retryTimer: any

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => {
        if (prev.find(item => item.id === notification.id)) {
          return prev
        }
        const updated = [notification, ...prev].slice(0, 50)
        return updated
      })
      setUnreadCount(prev => prev + 1)

      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        })
      }
    }

    const connect = () => {
      source = new EventSource('/api/notifications/stream')
      source.onmessage = event => {
        if (!event.data) return
        try {
          const payload = JSON.parse(event.data)
          handleNewNotification(payload)
        } catch (err) {
          console.error('Failed to parse notification payload', err)
        }
      }
      source.onerror = () => {
        source?.close()
        retryTimer = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      source?.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  function markAsRead(id: string) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  function markAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  function clearNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id))
    const notification = notifications.find(n => n.id === id)
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  function getNotificationIcon(type: string) {
    const icons: Record<string, any> = {
      user_banned: AlertCircle,
      user_unbanned: Check,
      mail_sent: Mail,
      config_updated: Settings,
      event_created: Calendar,
      event_updated: Calendar,
      event_deleted: Calendar,
      reward_granted: Gift,
      system_alert: AlertCircle,
    }
    const Icon = icons[type] || Info
    return <Icon className="h-5 w-5" />
  }

  function getNotificationColor(type: string) {
    const colors: Record<string, string> = {
      user_banned: 'text-red-600 bg-red-50',
      user_unbanned: 'text-green-600 bg-green-50',
      mail_sent: 'text-blue-600 bg-blue-50',
      config_updated: 'text-purple-600 bg-purple-50',
      event_created: 'text-green-600 bg-green-50',
      event_updated: 'text-yellow-600 bg-yellow-50',
      event_deleted: 'text-red-600 bg-red-50',
      reward_granted: 'text-yellow-600 bg-yellow-50',
      system_alert: 'text-orange-600 bg-orange-50',
    }
    return colors[type] || 'text-gray-600 bg-gray-50'
  }

  function formatTime(timestamp: number) {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return t('justNow')
    if (diff < 3600000) return t('minutesAgo', { value: Math.floor(diff / 60000) })
    if (diff < 86400000) return t('hoursAgo', { value: Math.floor(diff / 3600000) })
    return new Date(timestamp).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
  }

  return (
    <div className="relative">
      {/* 通知按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <Bell className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知面板 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 通知列表 */}
          <div className="absolute right-0 top-12 z-50 w-96 max-h-[600px] bg-white rounded-lg shadow-xl border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold">{t('title')}</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {t('markAll')}
                </button>
              )}
            </div>

            {/* 通知列表 */}
            <div className="overflow-y-auto max-h-[500px]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>{t('empty')}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition ${
                        notification.read ? 'opacity-60' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>{formatTime(notification.timestamp)}</span>
                                {notification.adminName && (
                                  <span>{t('byAdmin', { name: notification.adminName })}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                clearNotification(notification.id)
                              }}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
