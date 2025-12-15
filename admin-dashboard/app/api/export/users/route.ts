import { NextRequest, NextResponse } from 'next/server'

const EXPORT_LIMIT = 5000

function toCsv(rows: any[]): string {
  const headers = [
    'userId',
    'username',
    'level',
    'gold',
    'totalRecharge',
    'status',
    'createdAt',
    'lastLoginTime',
    'channel',
    'campaign',
    'platform',
    'clientVersion',
    'web3Bound'
  ]
  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [
    headers.join(','),
    ...rows.map(r =>
      headers
        .map(h => {
          const v = r[h]
          if (h === 'createdAt' || h === 'lastLoginTime') {
            return v ? new Date(v).toISOString() : ''
          }
          return v
        })
        .map(escape)
        .join(',')
    )
  ]
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const filters = {
    page: 1,
    limit: EXPORT_LIMIT,
    search: body.search || '',
    status: body.status || 'all',
    channel: body.channel,
    platform: body.platform,
    web3Bound: body.web3Bound
  }

  // 调用同域 TSRPC 代理，沿用 cookie
  const url = new URL('/api/tsrpc/admin/GetUsers', req.nextUrl.origin)
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
    credentials: 'include'
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: 'export_failed' }, { status: upstream.status })
  }

  const result = await upstream.json()
  if (!result?.res?.users) {
    return NextResponse.json({ error: 'no_users' }, { status: 400 })
  }

  const csv = toCsv(result.res.users)
  const filename = `users-export-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}

export const dynamic = 'force-dynamic'
