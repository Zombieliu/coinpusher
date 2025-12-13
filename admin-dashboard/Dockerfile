# 管理后台 Dockerfile
FROM node:20-alpine AS base

# 使用与项目一致的 pnpm 版本
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

# 构建阶段：直接在 workspace 根安装并构建 admin-dashboard
FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY admin-dashboard/package.json admin-dashboard/package.json
RUN pnpm install --frozen-lockfile --prod=false
COPY . .
WORKDIR /app/admin-dashboard
RUN pnpm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/admin-dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/admin-dashboard/.next/static ./.next/static

USER nextjs

EXPOSE 3003
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
