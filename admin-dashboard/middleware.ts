import { NextRequest, NextResponse } from 'next/server'

/**
 * 将前端相对路径的 /admin/* 请求转发到网关域名，避免因为 NEXT_PUBLIC_API_URL
 * 未在构建期注入导致的 404。
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  if (!pathname.startsWith('/admin/')) {
    return NextResponse.next()
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL
  if (!apiBase) {
    return NextResponse.json(
      { error: 'API base URL is not configured' },
      { status: 500 }
    )
  }

  const target = new URL(pathname + search, apiBase)
  return NextResponse.rewrite(target)
}

export const config = {
  matcher: ['/admin/:path*'],
}
