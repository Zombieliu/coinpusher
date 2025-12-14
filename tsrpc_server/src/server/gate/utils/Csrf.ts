const DEFAULT_DISABLED = new Set<string>([
    'admin/ExportInviteLeaderboard',
    'admin/GetLogFile',
    'admin/GetLiveLogs'
]);

export function isCsrfOptional(apiPath: string): boolean {
    return DEFAULT_DISABLED.has(apiPath);
}
