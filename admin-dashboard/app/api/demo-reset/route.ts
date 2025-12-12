import { NextResponse } from 'next/server'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'

let tsNodeReady = false

const ERROR_MESSAGE = 'DEMO_RESET_SECRET 未配置，无法执行刷新'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const expectedSecret = process.env.DEMO_RESET_SECRET
  if (!expectedSecret) {
    return NextResponse.json(
      { success: false, error: ERROR_MESSAGE },
      { status: 500 },
    )
  }

  const payload = await request.json().catch(() => ({}))
  const providedSecret = payload?.secret?.trim()
  const target = (payload?.target || '').toLowerCase()

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: '无权执行演示数据刷新' },
      { status: 401 },
    )
  }

  if (!['staging', 'production'].includes(target)) {
    return NextResponse.json(
      { success: false, error: '请选择合法的目标环境' },
      { status: 400 }
    )
  }

  try {
    const projectRoot = process.cwd()
    const repoRoot = path.resolve(projectRoot, '..')
    const envDir = path.join(repoRoot, 'env')
    const envFile = path.join(envDir, target === 'production' ? '.env.production.local' : '.env.staging.local')

    if (fs.existsSync(envFile)) {
      const content = await fs.promises.readFile(envFile, 'utf-8')
      const parsed: Record<string, string> = {}
      content.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return
        const [key, ...rest] = trimmed.split('=')
        parsed[key] = rest.join('=').trim()
      })
      Object.entries(parsed).forEach(([key, value]) => {
        if (!key) return
        process.env[key] = value
      })
    }

    const seedFilePath = path.join(repoRoot, 'seed-full-demo.ts')
    const seedModule = await import(pathToFileURL(seedFilePath).href)
    const runFullDemoSeed = seedModule.runFullDemoSeed || seedModule.default
    if (typeof runFullDemoSeed !== 'function') {
      throw new Error('runFullDemoSeed 未导出，无法执行演示数据刷新')
    }
    await runFullDemoSeed()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[demo-reset] Failed to refresh full demo data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || '刷新失败，请检查服务器日志',
      },
      { status: 500 },
    )
  }
}
