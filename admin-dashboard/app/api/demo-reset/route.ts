import { NextResponse } from 'next/server'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

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

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: '无权执行演示数据刷新' },
      { status: 401 },
    )
  }

  try {
    const projectRoot = process.cwd()
    const repoRoot = path.resolve(projectRoot, '..')
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
