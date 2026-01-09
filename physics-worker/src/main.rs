/*!
 * Rust Room Service 主入口
 *
 * 职责：
 * 1. 启动 TCP 服务器监听 Node 连接
 * 2. 固定频率 tick 驱动物理模拟
 * 3. 转发消息：Node ↔ RoomManager
 */

mod net;
mod protocol;
mod room;

use anyhow::Result;
use std::time::Duration;
use tokio::sync::{broadcast, mpsc};
use tracing_subscriber::EnvFilter;

use crate::protocol::{FromNode, ToNode};
use crate::room::RoomManager;

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    tracing::info!("🚀 Rust Room Service starting...");

    // 配置
    let tcp_addr =
        std::env::var("ROOM_SERVICE_ADDR").unwrap_or_else(|_| "127.0.0.1:9000".to_string());
    let tick_rate_hz = std::env::var("TICK_RATE")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(30); // 默认 30Hz

    tracing::info!("TCP address: {}", tcp_addr);
    tracing::info!("Tick rate: {} Hz", tick_rate_hz);

    // 启动 TCP 服务器
    let listener = net::start_tcp_server(&tcp_addr).await?;

    // 创建 channel
    let (from_node_tx, mut from_node_rx) = mpsc::unbounded_channel::<FromNode>();
    let (to_node_tx, _to_node_rx) = broadcast::channel::<ToNode>(1000); // 使用broadcast channel

    let to_node_tx_for_accept = to_node_tx.clone();

    // 任务 1：接受连接并处理消息
    let connection_task = tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    tracing::info!("New connection from: {}", addr);

                    let from_node_tx = from_node_tx.clone();
                    let to_node_rx = to_node_tx_for_accept.subscribe(); // 每个连接订阅broadcast

                    tokio::spawn(async move {
                        if let Err(e) = net::handle_client(stream, from_node_tx, to_node_rx).await {
                            tracing::error!("Client handler error: {}", e);
                        }
                    });
                }
                Err(e) => {
                    tracing::error!("Accept error: {}", e);
                }
            }
        }
    });

    // 任务 2：固定频率 tick + 处理消息
    let tick_interval = Duration::from_millis(1000 / tick_rate_hz);
    let dt = 1.0 / tick_rate_hz as f32;

    let tick_task = tokio::spawn(async move {
        let mut room_manager = RoomManager::new();
        let mut interval = tokio::time::interval(tick_interval);

        loop {
            interval.tick().await;

            // 处理来自 Node 的消息
            while let Ok(msg) = from_node_rx.try_recv() {
                let mut outgoing = Vec::new();
                room_manager.handle_msg_from_node(msg, &mut outgoing);

                // 发送响应
                for msg in outgoing {
                    if let Err(e) = to_node_tx.send(msg) {
                        tracing::error!("Failed to send to Node: {}", e);
                    }
                }
            }

            // 执行物理 tick
            let mut outgoing = Vec::new();
            room_manager.tick_all(dt, &mut outgoing);

            // 发送快照
            for msg in outgoing {
                if let Err(e) = to_node_tx.send(msg) {
                    tracing::error!("Failed to send snapshot: {}", e);
                }
            }

            // 定期日志
            if room_manager.room_count() > 0 {
                tracing::trace!(
                    "Tick completed. Active rooms: {}",
                    room_manager.room_count()
                );
            }
        }
    });

    // 等待任务
    tokio::select! {
        result = connection_task => {
            tracing::error!("Connection task ended: {:?}", result);
        }
        result = tick_task => {
            tracing::error!("Tick task ended: {:?}", result);
        }
    }

    Ok(())
}
