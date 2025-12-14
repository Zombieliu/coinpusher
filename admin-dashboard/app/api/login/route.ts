import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const FALLBACK_BASE = 'https://gate-production-41a5.up.railway.app'
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || FALLBACK_BASE).replace(/\/$/, '')

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${API_BASE}/admin/Login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    return new Response(await res.text(), { status: res.status })
  }

  const data = await res.json()
  // 正常返回时把 token 写入 httpOnly cookie，前端仍可保留 localStorage 以兼容现有逻辑
  if (data?.isSucc && data.res?.token) {
    const cookieStore = await cookies()
    cookieStore.set('admin_token', data.res.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    })
  }

  return Response.json(data)
}
