import { cookies, headers } from 'next/headers'

import { isCsrfOptional } from '@/lib/csrf'

const FALLBACK_BASE = 'https://gate-production-41a5.up.railway.app'
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || FALLBACK_BASE).replace(/\/$/, '')

export async function POST(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const targetPath = params.path.join('/')
  const body = await req.json()

  // CSRF 双提交校验（部分接口可白名单）
  if (!isCsrfOptional(targetPath)) {
    const csrfCookie = (await cookies()).get('csrf_token')?.value
    const csrfHeader = headers().get('x-csrf-token')
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return new Response(JSON.stringify({ isSucc: false, err: { message: 'CSRF invalid' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  const token = (await cookies()).get('admin_token')?.value || ''
  const payload = {
    ...body,
    __ssoToken: token
  }

  const upstream = await fetch(`${API_BASE}/${targetPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' }
  })
}

export const dynamic = 'force-dynamic'
