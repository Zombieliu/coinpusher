# 管理后台 Dockerfile
FROM node:20-alpine AS base

# 使用与项目一致的 pnpm 版本
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

# 构建阶段：直接复制全部工作区后安装并构建 admin-dashboard
FROM base AS builder
WORKDIR /app
COPY . .

# 支持缺少锁文件的情形：优先使用锁文件，缺失则退回 --no-frozen-lockfile
ARG PNPM_INSTALL_FLAGS="--prod=false"
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile $PNPM_INSTALL_FLAGS; \
    else \
      echo "pnpm-lock.yaml not found, falling back to --no-frozen-lockfile"; \
      pnpm install --no-frozen-lockfile $PNPM_INSTALL_FLAGS; \
    fi
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
