ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app

# 如果需要国内镜像，可取消下一行注释
# RUN npm config set registry https://registry.npm.taobao.org/

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build && npm prune --production

FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/module/common/table/config ./dist/module/common/table/config
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
# 默认启动 Gate，其他服务可通过设置 SERVER_ENTRY=ServerMatch 等方式覆盖
ENV SERVER_ENTRY=ServerGate
# 默认端口供 Railway/容器平台参考，可在外部覆盖
ENV PORT=2000
EXPOSE 2000

ENTRYPOINT ["/entrypoint.sh"]
