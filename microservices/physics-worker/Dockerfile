FROM node:20-alpine

WORKDIR /app

# 复制 package.json
COPY ../../tsrpc_server/package*.json ./

# 安装依赖
RUN npm install --production

# 复制源代码
COPY ../shared ./shared
COPY ../../tsrpc_server/src ./tsrpc_server/src
COPY . .

# 暴露端口（如果需要健康检查）
EXPOSE 8080

# 启动 Worker
CMD ["node", "-r", "ts-node/register", "PhysicsWorker.ts"]
