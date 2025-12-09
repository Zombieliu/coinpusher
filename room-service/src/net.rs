/*!
 * 网络通信层 (Node ↔ Rust)
 *
 * 格式：1字节格式标志 + 4字节长度 + 消息体
 * 格式标志：0=JSON, 1=MessagePack
 */

use anyhow::Result;
use bytes::{Buf, BufMut, BytesMut};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio_util::codec::{Decoder, Encoder};

use crate::protocol::{FromNode, ToNode};

/// 消息格式
#[derive(Debug, Clone, Copy)]
pub enum MessageFormat {
    Json = 0,
    MessagePack = 1,
}

/// 消息编解码器（支持 JSON 和 MessagePack）
pub struct MessageCodec {
    /// 发送消息时使用的格式（接收时自动识别）
    pub encoding: MessageFormat,
}

impl Decoder for MessageCodec {
    type Item = FromNode;
    type Error = std::io::Error;

    fn decode(&mut self, src: &mut BytesMut) -> Result<Option<Self::Item>, Self::Error> {
        if src.len() < 5 {
            return Ok(None); // 等待更多数据 (1字节格式 + 4字节长度)
        }

        // 读取格式标志
        let format = src[0];

        // 读取长度前缀 (4字节，大端序)
        let mut length_bytes = [0u8; 4];
        length_bytes.copy_from_slice(&src[1..5]);
        let length = u32::from_be_bytes(length_bytes) as usize;

        if src.len() < 5 + length {
            return Ok(None); // 等待完整消息
        }

        // 读取消息体
        src.advance(5);
        let data = src.split_to(length);

        // 根据格式反序列化
        let msg = match format {
            0 => {
                // JSON
                serde_json::from_slice(&data).map_err(|e| {
                    std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        format!("JSON decode error: {}", e),
                    )
                })?
            }
            1 => {
                // MessagePack
                rmp_serde::from_slice(&data).map_err(|e| {
                    std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        format!("MessagePack decode error: {}", e),
                    )
                })?
            }
            _ => {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("Unknown message format: {}", format),
                ));
            }
        };

        Ok(Some(msg))
    }
}

impl Encoder<ToNode> for MessageCodec {
    type Error = std::io::Error;

    fn encode(&mut self, item: ToNode, dst: &mut BytesMut) -> Result<(), Self::Error> {
        // 根据配置的格式序列化
        let (format_byte, data) = match self.encoding {
            MessageFormat::Json => {
                let json = serde_json::to_vec(&item).map_err(|e| {
                    std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        format!("JSON encode error: {}", e),
                    )
                })?;
                (0u8, json)
            }
            MessageFormat::MessagePack => {
                let msgpack = rmp_serde::to_vec(&item).map_err(|e| {
                    std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        format!("MessagePack encode error: {}", e),
                    )
                })?;
                (1u8, msgpack)
            }
        };

        // 写入格式标志
        dst.put_u8(format_byte);

        // 写入长度前缀
        let length = data.len() as u32;
        dst.put_u32(length);

        // 写入消息体
        dst.put_slice(&data);

        Ok(())
    }
}

/// 启动 TCP 服务器
pub async fn start_tcp_server(addr: &str) -> Result<TcpListener> {
    let listener = TcpListener::bind(addr).await?;
    tracing::info!("Rust Room Service listening on {}", addr);
    Ok(listener)
}

/// 处理单个客户端连接
pub async fn handle_client(
    mut stream: TcpStream,
    tx: tokio::sync::mpsc::UnboundedSender<FromNode>,
    mut rx: tokio::sync::broadcast::Receiver<ToNode>,
) -> Result<()> {
    let (mut read_half, mut write_half) = stream.split();

    let mut read_buf = BytesMut::with_capacity(8192);
    let mut codec = MessageCodec {
        encoding: MessageFormat::MessagePack, // 使用 MessagePack 减少 60% 数据量
    };

    loop {
        tokio::select! {
            // 读取来自 Node 的消息
            result = read_half.read_buf(&mut read_buf) => {
                match result {
                    Ok(0) => {
                        tracing::info!("Client disconnected");
                        break;
                    }
                    Ok(_) => {
                        // 解码消息
                        while let Some(msg) = codec.decode(&mut read_buf)? {
                            tracing::debug!("Received from Node: {:?}", msg);
                            tx.send(msg)?;
                        }
                    }
                    Err(e) => {
                        tracing::error!("Read error: {}", e);
                        break;
                    }
                }
            }

            // 发送消息给 Node
            result = rx.recv() => {
                match result {
                    Ok(msg) => {
                        tracing::debug!("Sending to Node: {:?}", msg);

                        // 编码消息
                        let mut buf = BytesMut::new();
                        codec.encode(msg, &mut buf)?;

                        // 发送
                        write_half.write_all(&buf).await?;
                        write_half.flush().await?;
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                        tracing::warn!("Broadcast lagged by {} messages", n);
                        // 继续处理，不中断
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                        tracing::info!("Broadcast channel closed");
                        break;
                    }
                }
            }

            else => break,
        }
    }

    Ok(())
}
