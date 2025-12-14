# 管理后台 Dockerfile
FROM node:20-alpine AS base

# 使用与项目一致的 pnpm 版本
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

# 构建阶段：兼容在仓库根或 admin-dashboard 子目录下构建
FROM base AS builder
WORKDIR /app
COPY . .

# APP_PATH 默认 admin-dashboard；若构建上下文就是 admin-dashboard（目录不存在），创建到 /app 的符号链接以复用同一路径
ARG APP_PATH=admin-dashboard
RUN if [ ! -d "/app/$APP_PATH" ]; then ln -s /app "/app/$APP_PATH"; fi

# 支持缺少锁文件的情形：优先使用锁文件，缺失则退回 --no-frozen-lockfile
ARG PNPM_INSTALL_FLAGS="--prod=false"
RUN cd "/app/$APP_PATH" && \
    if [ -f pnpm-lock.yaml ] || [ -f ../pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile $PNPM_INSTALL_FLAGS; \
    else \
      echo "pnpm-lock.yaml not found, falling back to --no-frozen-lockfile"; \
      pnpm install --no-frozen-lockfile $PNPM_INSTALL_FLAGS; \
    fi && \
    pnpm run build && \
    cp -R .next /app/.next-export
WORKDIR /app/$APP_PATH

# 生产运行阶段
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next-export/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next-export/static ./.next/static

USER nextjs

EXPOSE 3003
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
