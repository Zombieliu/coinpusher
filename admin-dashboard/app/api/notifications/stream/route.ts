import { cookies } from 'next/headers'

const FALLBACK_BASE = 'https://gate-production-41a5.up.railway.app'
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || FALLBACK_BASE).replace(/\/$/, '')
const encoder = new TextEncoder()

async function fetchNotifications(token: string, since?: number) {
  const response = await fetch(`${API_BASE}/admin/GetNotifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      since,
      limit: 50,
      __ssoToken: token
    })
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json()
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  let stopped = false
  let cleanup: () => void = () => {
    stopped = true
  }

  const stream = new ReadableStream({
    start(controller) {
      const push = (data: string) => {
        if (stopped) return
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          stopped = true
        }
      }

      push(': connected\n\n')

      let since = Date.now() - 5 * 60 * 1000

      const poll = async () => {
        while (!stopped) {
          try {
            const result = await fetchNotifications(token, since)
            const records = Array.isArray(result?.notifications) ? result.notifications : []
            records
              .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0))
              .forEach((notification: any) => {
                since = Math.max(since, notification.timestamp || Date.now())
                push(`data: ${JSON.stringify(notification)}\n\n`)
              })
          } catch (error) {
            push(
              `event: error\ndata: ${JSON.stringify({ message: 'fetch_failed' })}\n\n`
            )
          }
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      }

      poll()

      const heartbeat = setInterval(() => {
        push(': heartbeat\n\n')
      }, 25000)

      cleanup = () => {
        if (stopped) return
        stopped = true
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // stream already closed
        }
      }
    },
    cancel() {
      cleanup()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  })
}
