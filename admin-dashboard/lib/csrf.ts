const CSRF_OPTIONAL = new Set([
  'admin/ExportInviteLeaderboard',
  'admin/GetLogFile',
  'admin/GetLiveLogs'
])

export function isCsrfOptional(apiPath: string): boolean {
  return CSRF_OPTIONAL.has(apiPath)
}
