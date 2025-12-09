/*!
 * 房间管理器模块
 */

pub mod events;
pub mod physics;
pub mod room_state;

use std::collections::HashMap;

use crate::protocol::{FromNode, ToNode};

use self::events::Event;
use self::room_state::RoomState;

/// 房间管理器
pub struct RoomManager {
    rooms: HashMap<String, RoomState>,
}

impl RoomManager {
    pub fn new() -> Self {
        Self {
            rooms: HashMap::new(),
        }
    }

    /// 处理来自 Node 的消息
    pub fn handle_msg_from_node(&mut self, msg: FromNode, outgoing: &mut Vec<ToNode>) {
        match msg {
            FromNode::CreateRoom { room_id, config } => {
                tracing::info!("Creating room: {}", room_id);
                self.rooms
                    .insert(room_id.clone(), RoomState::new(room_id, config));
            }

            FromNode::DestroyRoom { room_id } => {
                tracing::info!("Destroying room: {}", room_id);
                self.rooms.remove(&room_id);
            }

            FromNode::PlayerJoin { room_id, player_id } => {
                if let Some(room) = self.rooms.get_mut(&room_id) {
                    room.push_event(Event::PlayerJoin { player_id });
                } else {
                    tracing::warn!("Player join failed: room {} not found", room_id);
                }
            }

            FromNode::PlayerLeave { room_id, player_id } => {
                if let Some(room) = self.rooms.get_mut(&room_id) {
                    room.push_event(Event::PlayerLeave { player_id });
                } else {
                    tracing::warn!("Player leave failed: room {} not found", room_id);
                }
            }

            FromNode::PlayerDropCoin {
                room_id,
                player_id,
                x,
                ..
            } => {
                if let Some(room) = self.rooms.get_mut(&room_id) {
                    room.push_event(Event::PlayerDropCoin { player_id, x });
                } else {
                    tracing::warn!("Drop coin failed: room {} not found", room_id);
                }
            }

            FromNode::WalletResult {
                room_id,
                player_id,
                tx_id,
                ok,
            } => {
                if let Some(room) = self.rooms.get_mut(&room_id) {
                    room.push_event(Event::WalletResult {
                        player_id,
                        tx_id,
                        ok,
                    });
                } else {
                    tracing::warn!("Wallet result failed: room {} not found", room_id);
                }
            }
        }
    }

    /// 所有房间执行一次 tick
    pub fn tick_all(&mut self, dt: f32, outgoing: &mut Vec<ToNode>) {
        for (room_id, room) in self.rooms.iter_mut() {
            let mut room_events = Vec::new();
            room.tick(dt, &mut room_events);

            // 检查是否应该发送快照（根据配置的频率）
            if !room.accumulate_and_should_send_snapshot(dt) {
                // 跳过本帧快照
                continue;
            }

            // 收集硬币状态
            let coins = room.physics.collect_coin_states();
            let push_z = room.physics.get_push_z();

            // 决定发送完整快照还是增量快照
            if room.should_send_full_snapshot() {
                // 发送完整快照
                outgoing.push(ToNode::Snapshot {
                    room_id: room_id.clone(),
                    tick: room.tick,
                    push_z,
                    coins: coins.clone(),
                    events: room_events,
                });

                // 更新缓存并重置计数
                room.update_snapshot_cache(&coins);
                room.reset_delta_count();
            } else {
                // 计算增量
                let (added, updated, removed) = room.compute_delta(&coins);

                // 发送增量快照
                outgoing.push(ToNode::DeltaSnapshot {
                    room_id: room_id.clone(),
                    tick: room.tick,
                    push_z,
                    added,
                    updated,
                    removed,
                    events: room_events,
                });

                // 更新缓存并增加计数
                room.update_snapshot_cache(&coins);
                room.increment_delta_count();
            }
        }
    }

    /// 获取房间数量
    pub fn room_count(&self) -> usize {
        self.rooms.len()
    }
}

impl Default for RoomManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::RoomConfig;

    fn create_test_config() -> RoomConfig {
        RoomConfig {
            gravity: -20.0,
            drop_height: 10.0,
            coin_radius: 0.5,
            coin_height: 0.1,
            reward_line_z: -0.5,
            push_min_z: -8.8,
            push_max_z: -6.0,
            push_speed: 1.5,
            snapshot_rate: 30.0,
        }
    }

    #[test]
    fn test_room_manager_creation() {
        let manager = RoomManager::new();
        assert_eq!(manager.room_count(), 0);
    }

    #[test]
    fn test_create_room() {
        let mut manager = RoomManager::new();
        let mut outgoing = Vec::new();

        manager.handle_msg_from_node(
            FromNode::CreateRoom {
                room_id: "room1".to_string(),
                config: create_test_config(),
            },
            &mut outgoing,
        );

        assert_eq!(manager.room_count(), 1);
    }

    #[test]
    fn test_destroy_room() {
        let mut manager = RoomManager::new();
        let mut outgoing = Vec::new();

        // 创建房间
        manager.handle_msg_from_node(
            FromNode::CreateRoom {
                room_id: "room1".to_string(),
                config: create_test_config(),
            },
            &mut outgoing,
        );

        assert_eq!(manager.room_count(), 1);

        // 销毁房间
        manager.handle_msg_from_node(
            FromNode::DestroyRoom {
                room_id: "room1".to_string(),
            },
            &mut outgoing,
        );

        assert_eq!(manager.room_count(), 0);
    }

    #[test]
    fn test_multiple_rooms() {
        let mut manager = RoomManager::new();
        let mut outgoing = Vec::new();

        // 创建3个房间
        for i in 1..=3 {
            manager.handle_msg_from_node(
                FromNode::CreateRoom {
                    room_id: format!("room{}", i),
                    config: create_test_config(),
                },
                &mut outgoing,
            );
        }

        assert_eq!(manager.room_count(), 3);
    }

    #[test]
    fn test_player_join() {
        let mut manager = RoomManager::new();
        let mut outgoing = Vec::new();

        // 创建房间
        manager.handle_msg_from_node(
            FromNode::CreateRoom {
                room_id: "room1".to_string(),
                config: create_test_config(),
            },
            &mut outgoing,
        );

        // 玩家加入
        manager.handle_msg_from_node(
            FromNode::PlayerJoin {
                room_id: "room1".to_string(),
                player_id: "player1".to_string(),
            },
            &mut outgoing,
        );

        // 应该没有错误
        assert_eq!(manager.room_count(), 1);
    }

    #[test]
    fn test_drop_coin() {
        let mut manager = RoomManager::new();
        let mut outgoing = Vec::new();

        // 创建房间
        manager.handle_msg_from_node(
            FromNode::CreateRoom {
                room_id: "room1".to_string(),
                config: create_test_config(),
            },
            &mut outgoing,
        );

        // 玩家加入
        manager.handle_msg_from_node(
            FromNode::PlayerJoin {
                room_id: "room1".to_string(),
                player_id: "player1".to_string(),
            },
            &mut outgoing,
        );

        // 投币
        manager.handle_msg_from_node(
            FromNode::PlayerDropCoin {
                room_id: "room1".to_string(),
                player_id: "player1".to_string(),
                x: 2.5,
                client_tick: None,
            },
            &mut outgoing,
        );

        // tick一次，应该发送快照
        outgoing.clear();
        manager.tick_all(1.0 / 30.0, &mut outgoing);

        assert!(!outgoing.is_empty());
        // 第一次会发送 DeltaSnapshot，所有硬币都在 added 列表中
        match &outgoing[0] {
            ToNode::DeltaSnapshot { added, .. } => {
                assert_eq!(added.len(), 1); // 应该有一个硬币
            }
            ToNode::Snapshot { coins, .. } => {
                assert_eq!(coins.len(), 1); // 应该有一个硬币
            }
            _ => panic!("Expected Snapshot or DeltaSnapshot message"),
        }
    }

    #[test]
    fn test_tick_generates_snapshots() {
        let mut manager = RoomManager::new();
        let mut outgoing = Vec::new();

        // 创建2个房间
        manager.handle_msg_from_node(
            FromNode::CreateRoom {
                room_id: "room1".to_string(),
                config: create_test_config(),
            },
            &mut outgoing,
        );

        manager.handle_msg_from_node(
            FromNode::CreateRoom {
                room_id: "room2".to_string(),
                config: create_test_config(),
            },
            &mut outgoing,
        );

        // tick一次
        outgoing.clear();
        manager.tick_all(1.0 / 30.0, &mut outgoing);

        // 应该生成2个快照（可能是 Snapshot 或 DeltaSnapshot）
        assert_eq!(outgoing.len(), 2);
        assert!(matches!(outgoing[0], ToNode::Snapshot { .. } | ToNode::DeltaSnapshot { .. }));
        assert!(matches!(outgoing[1], ToNode::Snapshot { .. } | ToNode::DeltaSnapshot { .. }));
    }

    #[test]
    fn test_tick_increments() {
        let mut manager = RoomManager::new();
        let mut outgoing = Vec::new();

        manager.handle_msg_from_node(
            FromNode::CreateRoom {
                room_id: "room1".to_string(),
                config: create_test_config(),
            },
            &mut outgoing,
        );

        // tick多次
        for _ in 0..10 {
            outgoing.clear();
            manager.tick_all(1.0 / 30.0, &mut outgoing);
        }

        // 检查最后一次的tick值（可能是 Snapshot 或 DeltaSnapshot）
        match &outgoing[0] {
            ToNode::Snapshot { tick, .. } => {
                assert_eq!(*tick, 10);
            }
            ToNode::DeltaSnapshot { tick, .. } => {
                assert_eq!(*tick, 10);
            }
            _ => panic!("Expected Snapshot or DeltaSnapshot message"),
        }
    }
}
