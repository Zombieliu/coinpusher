import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

const FALLBACK_BASE = 'https://gate-production-41a5.up.railway.app'
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || FALLBACK_BASE).replace(/\/$/, '')

export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${API_BASE}/admin/AdminLogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    return new Response(await res.text(), { status: res.status })
  }

  const data = await res.json()

  if (data?.res?.adminUser && !data.res.admin) {
    data.res.admin = data.res.adminUser
  }

  if (data?.isSucc && data.res?.token) {
    const cookieStore = await cookies()
    const csrfToken = crypto.randomBytes(24).toString('hex')
    cookieStore.set('admin_token', data.res.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    })
    cookieStore.set('csrf_token', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    })
    if (data.res.admin) {
      cookieStore.set('admin_user', encodeURIComponent(JSON.stringify(data.res.admin)), {
        httpOnly: false,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      })
    }
  }

  return Response.json(data)
}
