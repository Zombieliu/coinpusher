# 管理后台 Dockerfile
FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 依赖安装阶段
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成构建产物
RUN pnpm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
# 注意：如果没有 public 目录，可以跳过
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3003

ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
