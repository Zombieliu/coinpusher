/*!
 * 房间内部事件系统
 */

use crate::protocol::{PlayerId, RoomEvent};

/// 房间内部事件
#[derive(Debug, Clone)]
pub enum Event {
    /// 玩家加入
    PlayerJoin {
        player_id: PlayerId,
    },

    /// 玩家离开
    PlayerLeave {
        player_id: PlayerId,
    },

    /// 玩家投币
    PlayerDropCoin {
        player_id: PlayerId,
        x: f32,
    },

    /// 钱包操作结果
    WalletResult {
        player_id: PlayerId,
        tx_id: String,
        ok: bool,
    },
}

impl Event {
    /// 应用事件到房间状态
    pub fn apply(
        self,
        room: &mut super::room_state::RoomState,
        out_events: &mut Vec<RoomEvent>,
    ) {
        use super::room_state::PlayerInfo;

        match self {
            Event::PlayerJoin { player_id } => {
                room.players.entry(player_id.clone()).or_insert(PlayerInfo {
                    id: player_id,
                });
                tracing::info!("Player joined room: {}", room.id);
            }

            Event::PlayerLeave { player_id } => {
                room.players.remove(&player_id);
                tracing::info!("Player left room: {}", room.id);
            }

            Event::PlayerDropCoin { player_id, x } => {
                // 简化版：直接生成硬币（假设已扣费）
                // 生产版应该先发 NeedDeductGold，等 WalletResult 再生成
                let coin_id = room.physics.spawn_coin(x, Some(player_id.clone()));
                tracing::debug!("Player {} dropped coin {} at x={}", player_id, coin_id, x);
            }

            Event::WalletResult { player_id, ok, .. } => {
                if ok {
                    tracing::debug!("Wallet operation success for {}", player_id);
                } else {
                    tracing::warn!("Wallet operation failed for {}", player_id);
                }
            }
        }
    }
}
