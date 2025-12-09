/**
 * Minimal Polyfills for Browser Environment
 *
 * NOTE: dubhe.js provides most dependencies (Buffer, @mysten/sui, etc.)
 * This file only provides minimal global polyfills to avoid conflicts.
 */

// Make sure we're in browser environment
if (typeof window !== 'undefined') {
    // Set global to window
    (window as any).global = window;

    console.log('[Polyfills] Minimal polyfills loaded');
    console.log('[Polyfills] Waiting for dubhe.js to load Buffer and other dependencies...');

    // Polyfill for 'process'
    if (typeof (window as any).process === 'undefined') {
        (window as any).process = {
            env: { NODE_ENV: 'production' },
            version: 'v16.0.0',
            versions: {},
            nextTick: (fn: Function, ...args: any[]) => {
                setTimeout(() => fn(...args), 0);
            },
            cwd: () => '/',
            browser: true,
            platform: 'browser',
            stdout: null,
            stderr: null,
            stdin: null
        };
    }

    console.log('[Polyfills] Minimal browser polyfills loaded');
    console.log('[Polyfills] Note: Buffer and other Node.js modules are provided by dubhe.js');
}
