# 多阶段构建 - Rust Room Service
FROM rust:1.83-slim as builder

WORKDIR /build

# 安装依赖
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY benches ./benches

# 构建 release 版本
RUN cargo build --release

# 运行时镜像
FROM debian:bookworm-slim

WORKDIR /app

# 安装运行时依赖
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# 从构建阶段复制可执行文件
COPY --from=builder /build/target/release/room-service /app/room-service

# 暴露端口
EXPOSE 9000

# 环境变量
ENV RUST_LOG=info
ENV ROOM_SERVICE_ADDR=0.0.0.0:9000
ENV TICK_RATE=30

# 启动服务
CMD ["/app/room-service"]
