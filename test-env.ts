/**
 * 测试/脚本通用的环境配置工具
 *
 * 统一解析网关地址、Mongo 连接串等，确保在 Docker（https://localhost:32000、27018）
 * 和本地开发（http://127.0.0.1:3000、27017）场景都能自动适配。
 */

function normalizeGateUrl(url?: string | null): string | null {
    if (!url) {
        return null;
    }

    const trimmed = url.trim();
    if (!trimmed) {
        return null;
    }

    // docker-compose 内部地址 gate-server:3000 对宿主机不可用，映射到 32000
    if (trimmed.includes('gate-server')) {
        return trimmed.startsWith('https')
            ? 'https://localhost:32000'
            : 'http://localhost:32000';
    }

    return trimmed;
}

const GATE_HTTP_CANDIDATES = [
    process.env.GATE_HTTP_URL,
    process.env.API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.GATE_URL,
    process.env.GATE_SERVER_URL,
    'https://localhost:32000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:2000'
].map(normalizeGateUrl).filter(Boolean) as string[];

const MONGO_URI_CANDIDATES = [
    process.env.MONGO_URI,
    process.env.MONGODB_URI,
    process.env.DATABASE_URL,
    'mongodb://127.0.0.1:27018/coinpusher_game',
    'mongodb://127.0.0.1:27017/coinpusher_game',
    'mongodb://127.0.0.1:27017/coin_pusher'
].filter((uri): uri is string => Boolean(uri && uri.trim()));

const DEFAULT_GATE_HTTP_URL = GATE_HTTP_CANDIDATES[0]!;
const DEFAULT_MONGO_URI = MONGO_URI_CANDIDATES[0]!;
const DEFAULT_DB_NAME = process.env.DB_NAME || 'coinpusher_game';

function toWsUrl(httpUrl: string): string {
    if (httpUrl.startsWith('https://')) {
        return `wss://${httpUrl.slice('https://'.length)}`;
    }
    if (httpUrl.startsWith('http://')) {
        return `ws://${httpUrl.slice('http://'.length)}`;
    }
    return httpUrl;
}

export function getGateHttpUrl(): string {
    return DEFAULT_GATE_HTTP_URL;
}

export function getGateWsUrl(): string {
    return toWsUrl(DEFAULT_GATE_HTTP_URL);
}

export function getMongoUri(): string {
    return DEFAULT_MONGO_URI;
}

export function getMongoDbName(): string {
    return DEFAULT_DB_NAME;
}

export function prettyPrintEnv(): void {
    console.log('[Env] 使用网关地址:', getGateHttpUrl());
    console.log('[Env] 使用 Mongo URI:', getMongoUri());
    console.log('[Env] 数据库:', getMongoDbName());
}
